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
    }
    post {
        always {
            deleteDir() /* clean up our workspace */
        }
    }
}