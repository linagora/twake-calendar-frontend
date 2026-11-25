pipeline {
    agent {
        label 'heavy'
    }

    tools {
        nodejs 'nodejs_24'
    }

    options {
        // Configure an overall timeout for the build.
        // 2 hours: the e2e stage boots a full backend stack in docker.
        timeout(time: 2, unit: 'HOURS')
        disableConcurrentBuilds()
    }
    
    // No pipeline-level credentials, see withGithubCredential and withDockerHubLogin.
    stages {
      stage('Authorize fork') {
        // A fork pull request runs no code of its own before an org member vouches for its head
        // commit, see authorizeFork
        when {
          changeRequest()
          expression { env.CHANGE_FORK != null }
        }
        steps {
          script {
            authorizeFork()
          }
        }
      }
      stage('Compile') {
          steps {
            sh 'npm ci'
          }
      }
      stage('Test') {
        steps {
          sh 'npm run test'
        }
      }
      stage('Check Lint') {
        steps {
          sh 'npm run lint'
        }
      }
      stage('Check Formatting') {
        steps {
          sh 'npm run lint:fmt'
        }
      }
      stage('End to end tests') {
        steps {
          // The e2e suite drives the production frontend images against a real backend,
          // see e2e/README.md. Both applications are under test -- the private one and the
          // public booking pages -- so both bundles are built here and reused as is.
          sh 'npm run build'
          dir('e2e') {
            sh 'SKIP_FRONTEND_BUILD=true ./pre-build.sh'
            sh 'mvn clean test -Dapi.version=1.43'
          }
        }
        post {
          always {
            junit(testResults: 'e2e/target/surefire-reports/*.xml', allowEmptyResults: false)
          }
          failure {
            // Screenshots and Playwright traces of whatever broke
            archiveArtifacts artifacts: 'e2e/target/e2e-artifacts/**', allowEmptyArchive: true
          }
        }
      }
      stage('Deploy docker image (PR)') {
        when {
          changeRequest()
        }
        steps {
          script {
            def dockerTag = "${env.CHANGE_ID}"
            env.DOCKER_TAG = dockerTag
            echo "Docker tag: ${dockerTag}"
            def shortSha = env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'dev'
            sh 'npm run build'
            sh "docker build -f apps/private/Dockerfile --build-arg BUILD_VERSION=${shortSha} -t linagora/twake-calendar-web-pr:\$DOCKER_TAG ."
            sh "docker build -f apps/public/Dockerfile --build-arg BUILD_VERSION=${shortSha} -t linagora/twake-calendar-public-pr:\$DOCKER_TAG ."
            withDockerHubLogin {
              sh 'docker push linagora/twake-calendar-web-pr:$DOCKER_TAG'
              sh 'docker push linagora/twake-calendar-public-pr:$DOCKER_TAG'
            }
            withGithubCredential {
              sh """
                HTTP_STATUS=\$(curl -s -o /tmp/gh_comment_response.json -w "%{http_code}" -X POST \\
                  -H "Authorization: token \${GITHUB_CREDENTIAL_PSW}" \\
                  -H "Content-Type: application/json" \\
                  -d "{\\"body\\": \\"Docker images published for this PR:\\n- Private: linagora/twake-calendar-web-pr:${dockerTag}\\n- Public: linagora/twake-calendar-public-pr:${dockerTag}\\"}" \\
                  "https://api.github.com/repos/linagora/twake-calendar-frontend/issues/\${CHANGE_ID}/comments")
                if [ "\$HTTP_STATUS" -lt 200 ] || [ "\$HTTP_STATUS" -ge 300 ]; then
                  echo "WARNING: GitHub API comment failed with HTTP \$HTTP_STATUS"
                  cat /tmp/gh_comment_response.json
                fi
              """
            }
          }
        }
      }
      stage('Deploy docker images') {
        when {
          anyOf {
            branch 'main'
            buildingTag()
          }
        }
        steps {
          withVault([
            vaultSecrets: [
                [path: 'secret/jenkins/calendar-frontend', secretValues: [
                    [envVar: 'SENTRY_AUTH_TOKEN', vaultKey: 'SENTRY_AUTH_TOKEN'],
                    [envVar: 'SENTRY_ORG', vaultKey: 'SENTRY_ORG'],
                    [envVar: 'SENTRY_PROJECT', vaultKey: 'SENTRY_PROJECT'],
                    [envVar: 'SENTRY_URL', vaultKey: 'SENTRY_URL']
                ]]
            ]
          ]) {
            script {
              def shortSha = env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'dev'
              env.DOCKER_TAG = 'branch-master'
              env.BUILD_VERSION = shortSha
              if (env.TAG_NAME) {
                env.DOCKER_TAG = env.TAG_NAME
                env.BUILD_VERSION = env.TAG_NAME
              }

              echo "Docker tag: ${env.DOCKER_TAG}"
              sh 'npm run build'
              sh 'docker build -f apps/private/Dockerfile --build-arg BUILD_VERSION=$BUILD_VERSION -t linagora/twake-calendar-web:$DOCKER_TAG .'
              sh 'docker build -f apps/public/Dockerfile --build-arg BUILD_VERSION=$BUILD_VERSION -t linagora/twake-calendar-public:$DOCKER_TAG .'
              withDockerHubLogin {
                sh 'docker push linagora/twake-calendar-web:$DOCKER_TAG'
                sh 'docker push linagora/twake-calendar-public:$DOCKER_TAG'
              }
            }
          }
        }
      }
    }
    post {
        always {
            deleteDir() /* clean up our workspace */
        }
    }
}

def githubRepository() {
  return 'linagora/twake-calendar-frontend'
}

// ---- Fork authorization and credentials. The same block is in the Jenkinsfiles of
// twake-contacts-frontend, twake-calendar-frontend, twake-calendar-side-service, webadmin-proxy,
// tmail-flutter, esn-sabre, tmail-backend and twake-mail-admin: change it in all of them. Only
// githubRepository() differs.
//
// No credential is bound at pipeline level: every stage runs code of the checked out sources (build
// plugins, package scripts, tests, scripts/), so secrets are bound only around the steps that need
// them, see withGithubCredential and withDockerHubLogin.

// A fork pull request runs no code of its own before an org member vouches for its head commit: the
// owner of the fork is a linagora member, or a member approved that very commit (see
// memberReviewerOf). An approval names one commit, so a commit pushed after it is not built until a
// member approves it again.
def authorizeFork() {
  withGithubCredential {
    // CHANGE_FORK is 'owner', or 'owner/repository' for a fork renamed on GitHub
    def forkOwner = env.CHANGE_FORK.tokenize('/')[0]
    // Jenkins may set CHANGE_FORK to 'linagora' for a branch of the repository itself: only someone
    // with write access pushes there, and an organization is not a member of itself.
    if (forkOwner == 'linagora' || isOrgMember(forkOwner)) {
      echo "Fork owner '${forkOwner}' is a linagora org member, proceeding."
      env.FORK_AUTHORIZED = 'true'
      return
    }
    def headSha = pullRequestHead()
    def approver = memberReviewerOf(headSha)
    if (approver) {
      echo "Commit ${headSha} approved by linagora member '${approver}', proceeding."
      requireApprovedCheckout(headSha)
      env.FORK_AUTHORIZED = 'true'
      return
    }
    error("Fork owner '${forkOwner}' is not a linagora org member and no member reviewed commit ${headSha}. " +
      "A linagora member must approve the pull request on this commit, or comment 'Build this please ${headSha}', " +
      "then re-run the build.")
  }
}

// Whether the build may run code of the checked out sources, for the post actions that run even
// when the fork authorization failed
def mayRunChangeCode() {
  return env.CHANGE_FORK == null || env.FORK_AUTHORIZED == 'true'
}

// The head commit of the pull request, as GitHub reports it now. It need not be the commit Jenkins
// checked out: the contributor can push between the checkout and this call. See
// requireApprovedCheckout.
def pullRequestHead() {
  return githubApi("pulls/${env.CHANGE_ID}").head.sha
}

// Fails the build unless what Jenkins checked out is the approved commit: HEAD itself, or the merge
// Jenkins made of the pull request revision it pinned with the target branch, whose first parent is
// that revision. The pinned revision is the one Jenkins reports the build status on, so the status
// always names an approved commit. The contributor chooses the parents of the commits they push, so
// a parent of HEAD is trusted only when the pinned revision, fetched as origin/<BRANCH_NAME>, is it.
def requireApprovedCheckout(String sha) {
  withEnv(["APPROVED_SHA=${sha}"]) {
    sh '''
      head=$(git rev-parse HEAD)
      if [ "$head" = "$APPROVED_SHA" ]; then
        exit 0
      fi
      pinned=$(git rev-parse -q --verify "refs/remotes/origin/$BRANCH_NAME^{commit}" || true)
      first=$(git rev-parse -q --verify "HEAD^1" || true)
      if [ "$pinned" = "$APPROVED_SHA" ] && [ "$first" = "$APPROVED_SHA" ]; then
        echo "Building $head, the merge of the approved commit $APPROVED_SHA with the target branch"
        exit 0
      fi
      echo "The pull request head moved to $APPROVED_SHA since the checkout of $head (pull request revision ${pinned:-unknown}): re-run the build." >&2
      exit 1
    '''
  }
}

// The login of a linagora member who vouched for the given commit: an approving review of it, a review
// 'Build this please' of it, or a comment 'Build this please <sha>' naming its full id. A prefix is not
// accepted: the contributor writes the commits, and can craft one sharing a short prefix with the
// reviewed one. GitHub lists reviews and comments oldest first, 100 per page at most: every page is read.
def memberReviewerOf(String sha) {
  def page = 1
  while (true) {
    def reviews = githubApi("pulls/${env.CHANGE_ID}/reviews?per_page=100&page=${page}")
    for (review in reviews) {
      def approves = review.state == 'APPROVED' ||
        (review.state != 'DISMISSED' && "${review.body}".trim() == 'Build this please')
      if (review.commit_id == sha && approves && isOrgMember(review.user.login)) {
        return review.user.login
      }
    }
    if (reviews.size() < 100) {
      break
    }
    page++
  }
  def approval = "build this please ${sha}".toString()
  page = 1
  while (true) {
    def comments = githubApi("issues/${env.CHANGE_ID}/comments?per_page=100&page=${page}")
    for (comment in comments) {
      def body = "${comment.body}".trim().toLowerCase().replaceAll('\\s+', ' ')
      if (body == approval && isOrgMember(comment.user.login)) {
        return comment.user.login
      }
    }
    if (comments.size() < 100) {
      return null
    }
    page++
  }
}

def isOrgMember(String login) {
  def status
  withEnv(["GITHUB_LOGIN=${login}"]) {
    status = sh(
      script: 'curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_CREDENTIAL_PSW" ' +
        '"https://api.github.com/orgs/linagora/members/$GITHUB_LOGIN"',
      returnStdout: true
    ).trim()
  }
  echo "GitHub org membership check returned HTTP ${status} for '${login}'"
  if (status == '204') {
    return true
  }
  if (status == '404') {
    return false
  }
  error("GitHub API error ${status} while checking the membership of '${login}'")
}

def githubApi(String path) {
  def json
  withEnv(["GITHUB_API_PATH=${path}", "GITHUB_API_REPOSITORY=${githubRepository()}"]) {
    json = sh(
      script: 'curl -sf -H "Authorization: token $GITHUB_CREDENTIAL_PSW" ' +
        '"https://api.github.com/repos/$GITHUB_API_REPOSITORY/$GITHUB_API_PATH"',
      returnStdout: true
    )
  }
  return readJSON(text: json)
}

// Binds the GitHub token as GITHUB_CREDENTIAL_USR / GITHUB_CREDENTIAL_PSW around the given steps only
def withGithubCredential(Closure body) {
  withCredentials([usernamePassword(credentialsId: 'github',
      usernameVariable: 'GITHUB_CREDENTIAL_USR', passwordVariable: 'GITHUB_CREDENTIAL_PSW')]) {
    body()
  }
}

// Logs in Docker Hub in a throwaway Docker config deleted afterwards, so that the credential never
// stays on the agent where a later build could read it
def withDockerHubLogin(Closure body) {
  withEnv(["DOCKER_CONFIG=${pwd(tmp: true)}/docker-config"]) {
    try {
      withCredentials([usernamePassword(credentialsId: 'dockerHub',
          usernameVariable: 'DOCKER_HUB_CREDENTIAL_USR', passwordVariable: 'DOCKER_HUB_CREDENTIAL_PSW')]) {
        sh 'mkdir -p "$DOCKER_CONFIG" && printf \'%s\' "$DOCKER_HUB_CREDENTIAL_PSW" | docker login -u "$DOCKER_HUB_CREDENTIAL_USR" --password-stdin'
      }
      body()
    } finally {
      sh 'docker logout || true; rm -rf "$DOCKER_CONFIG"'
    }
  }
}
