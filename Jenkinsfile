def notifyDiscord(String status) {
    withCredentials([string(credentialsId: 'discord-webhook-url', variable: 'DISCORD_WEBHOOK_URL')]) {
        discordSend(
            webhookURL: env.DISCORD_WEBHOOK_URL,
            title: "Build ${status == 'SUCCESS' ? 'Succeeded' : 'Failed'}",
            description: """**Job:** ${env.JOB_NAME ?: 'unknown'}
**Build:** #${env.BUILD_NUMBER ?: 'unknown'}
**Image tag:** ${env.IMAGE_TAG ?: 'not-built'}
**Status:** ${status}
**Branch:** ${env.CI_BRANCH ?: 'unknown'}
**Commit:** ${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : 'unknown'}""",
            footer: 'Jenkins CI/CD',
            link: env.BUILD_URL,
            result: status,
            showChangeset: true
        )
    }
}

pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        DOCKERHUB_USER = 'shii108'
        BACKEND_IMAGE = "${DOCKERHUB_USER}/todo-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/todo-frontend"
        KUBE_NAMESPACE = 'todo-app'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()
                    def branch = env.CHANGE_BRANCH ?: env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'unknown'
                    env.CI_BRANCH = branch.replaceFirst(/^origin\//, '')
                }
            }
        }

        stage('Test') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm run lint'
                    sh 'npm test'
                    sh 'npm audit --omit=dev --audit-level=high'
                }
            }
        }

        stage('Validate Manifests') {
            steps {
                sh 'docker compose config --quiet'
                sh 'kubectl kustomize k3s > /dev/null'
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                    docker build --pull \
                      --label org.opencontainers.image.revision="$GIT_COMMIT" \
                      -t "$BACKEND_IMAGE:$IMAGE_TAG" ./backend
                    docker build --pull \
                      --label org.opencontainers.image.revision="$GIT_COMMIT" \
                      -t "$FRONTEND_IMAGE:$IMAGE_TAG" ./frontend
                '''
            }
        }

        stage('Scan Images') {
            steps {
                sh 'trivy image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL "$BACKEND_IMAGE:$IMAGE_TAG"'
                sh 'trivy image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL "$FRONTEND_IMAGE:$IMAGE_TAG"'
            }
        }

        stage('Push Images') {
            when {
                expression { env.CI_BRANCH == 'main' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        set +x
                        echo "$DOCKER_PASS" | docker login --username "$DOCKER_USER" --password-stdin
                        docker push "$BACKEND_IMAGE:$IMAGE_TAG"
                        docker push "$FRONTEND_IMAGE:$IMAGE_TAG"
                    '''
                }
            }
        }

        stage('Deploy to k3s') {
            when {
                expression { env.CI_BRANCH == 'main' }
            }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        kubectl apply -f k3s/namespace.yaml
                        kubectl get secret postgres-secret -n "$KUBE_NAMESPACE" > /dev/null
                        kubectl apply -k k3s
                        kubectl set image deployment/backend backend="$BACKEND_IMAGE:$IMAGE_TAG" -n "$KUBE_NAMESPACE"
                        kubectl set image deployment/frontend frontend="$FRONTEND_IMAGE:$IMAGE_TAG" -n "$KUBE_NAMESPACE"
                        kubectl rollout status deployment/backend -n "$KUBE_NAMESPACE" --timeout=180s
                        kubectl rollout status deployment/frontend -n "$KUBE_NAMESPACE" --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout >/dev/null 2>&1 || true'
        }
        success {
            script {
                notifyDiscord('SUCCESS')
            }
        }
        failure {
            script {
                notifyDiscord('FAILURE')
            }
        }
    }
}
