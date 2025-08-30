pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIAL = credentials('dockerHub')
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
              sh 'npm install'
          }
      }
      stage('Test') {
        steps {
          sh 'npm run test'
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
