pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "shii108"
        BACKEND_IMAGE = "${DOCKERHUB_USER}/todo-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/todo-frontend"
        IMAGE_TAG = "v${BUILD_NUMBER}"
        KUBE_NAMESPACE = "todo-app"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Shii108/3-tier-k3s-devops-project.git'
            }
        }

        stage('Backend Test') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t $BACKEND_IMAGE:$IMAGE_TAG ./backend'
                sh 'docker build -t $FRONTEND_IMAGE:$IMAGE_TAG ./frontend'
            }
        }

        stage('Docker Login and Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh 'docker push $BACKEND_IMAGE:$IMAGE_TAG'
                    sh 'docker push $FRONTEND_IMAGE:$IMAGE_TAG'
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh 'kubectl set image deployment/backend backend=$BACKEND_IMAGE:$IMAGE_TAG -n $KUBE_NAMESPACE || true'
                sh 'kubectl set image deployment/frontend frontend=$FRONTEND_IMAGE:$IMAGE_TAG -n $KUBE_NAMESPACE || true'
                sh 'kubectl rollout status deployment/backend -n $KUBE_NAMESPACE'
                sh 'kubectl rollout status deployment/frontend -n $KUBE_NAMESPACE'
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully.'
        }
        failure {
            echo 'CI/CD pipeline failed.'
        }
    }
}
