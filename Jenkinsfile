pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIAL = credentials('dockerHub')
        GITHUB_CREDENTIAL = credentials('github')
    }

    tools {
        nodejs 'nodejs_24'
    }

    options {
        // Configure an overall timeout for the build.
        timeout(time: 1, unit: 'HOURS')
        disableConcurrentBuilds()
    }
    
    stages {
      stage('Compile') {
          steps {
            sh '''
            cat > .npmrc << EOF
            @linagora:registry=https://npm.pkg.github.com/
            //npm.pkg.github.com/:_authToken=${GITHUB_CREDENTIAL_PSW}
            EOF
            '''
              sh 'npm install'
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
          sh 'npx prettier --check .'
        }
      }
      stage('Deploy docker image (PR)') {
        when {
          changeRequest()
        }
        steps {
          script {
            // If the PR comes from a fork, verify the fork owner is a linagora org member
            if (env.CHANGE_FORK) {
              def forkOwner = env.CHANGE_FORK
              def memberStatus = sh(
                script: """curl -s -o /dev/null -w "%{http_code}" \
                  -H "Authorization: token \${GITHUB_CREDENTIAL_PSW}" \
                  "https://api.github.com/orgs/linagora/members/${forkOwner}" """,
                returnStdout: true
              ).trim()
              echo "GitHub org membership check returned HTTP ${memberStatus} for '${forkOwner}'"
              if (memberStatus == '204') {
                echo "Fork owner '${forkOwner}' is a linagora org member, proceeding."
              } else if (memberStatus == '404') {
                echo "Fork owner '${forkOwner}' is not a member of the linagora organization."
                // Check if a linagora member has approved the build via comment
                def approvedByMember = false
                def commentsJson = sh(
                  script: """curl -s \
                    -H "Authorization: token \${GITHUB_CREDENTIAL_PSW}" \
                    "https://api.github.com/repos/linagora/twake-calendar-frontend/issues/\${CHANGE_ID}/comments" """,
                  returnStdout: true
                ).trim()
                def comments = readJSON text: commentsJson
                for (comment in comments) {
                  if (comment.body.trim() == 'Build this please') {
                    def commenter = comment.user.login
                    def commenterStatus = sh(
                      script: """curl -s -o /dev/null -w "%{http_code}" \
                        -H "Authorization: token \${GITHUB_CREDENTIAL_PSW}" \
                        "https://api.github.com/orgs/linagora/members/${commenter}" """,
                      returnStdout: true
                    ).trim()
                    if (commenterStatus == '204') {
                      echo "Build approved by linagora member '${commenter}', proceeding."
                      approvedByMember = true
                      break
                    }
                  }
                }
                if (!approvedByMember) {
                  echo "No linagora member approval found. Skipping deploy."
                  return
                }
              } else if (memberStatus == '401' || memberStatus == '403') {
                error("Authentication/permission error validating fork owner: ${memberStatus}")
              } else {
                error("GitHub API error ${memberStatus} while checking membership for '${forkOwner}'")
              }
            }

            def dockerTag = "pr-${env.CHANGE_ID}"
            env.DOCKER_TAG = dockerTag
            echo "Docker tag: ${dockerTag}"
            sh 'npm run build'
            sh 'docker build -t linagora/twake-calendar-web:$DOCKER_TAG .'
            sh 'echo $DOCKER_HUB_CREDENTIAL_PSW | docker login -u $DOCKER_HUB_CREDENTIAL_USR --password-stdin'
            sh 'docker push linagora/twake-calendar-web:$DOCKER_TAG'
            sh """
              HTTP_STATUS=\$(curl -s -o /tmp/gh_comment_response.json -w "%{http_code}" -X POST \\
                -H "Authorization: token \${GITHUB_CREDENTIAL_PSW}" \\
                -H "Content-Type: application/json" \\
                -d "{\\"body\\": \\"Docker image published for this PR: linagora/twake-calendar-web:${dockerTag}\\"}" \\
                "https://api.github.com/repos/linagora/twake-calendar-frontend/issues/\${CHANGE_ID}/comments")
              if [ "\$HTTP_STATUS" -lt 200 ] || [ "\$HTTP_STATUS" -ge 300 ]; then
                echo "WARNING: GitHub API comment failed with HTTP \$HTTP_STATUS"
                cat /tmp/gh_comment_response.json
              fi
            """
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
          script {
            env.DOCKER_TAG = 'branch-master'
            if (env.TAG_NAME) {
              env.DOCKER_TAG = env.TAG_NAME
            }

            echo "Docker tag: ${env.DOCKER_TAG}"
            sh 'npm run build'
            sh 'docker build -t linagora/twake-calendar-web:$DOCKER_TAG .'
            sh 'docker login -u $DOCKER_HUB_CREDENTIAL_USR -p $DOCKER_HUB_CREDENTIAL_PSW'
            sh 'docker push linagora/twake-calendar-web:$DOCKER_TAG'
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
