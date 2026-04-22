pipeline {
    agent any

    environment {
        NOTIFY_EMAIL = "your-email@gmail.com"   // ← change this
        IMAGE_TAG    = "${env.GIT_COMMIT?.take(8) ?: 'latest'}"
    }

    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_AUTHOR  = sh(script: "git log -1 --format='%an'", returnStdout: true).trim()
                    env.GIT_MESSAGE = sh(script: "git log -1 --format='%s'",  returnStdout: true).trim()
                    env.GIT_BRANCH  = env.BRANCH_NAME ?: sh(script: "git rev-parse --abbrev-ref HEAD", returnStdout: true).trim()
                }
                echo "Branch: ${env.GIT_BRANCH} | Commit: ${env.GIT_COMMIT?.take(8)} | Author: ${env.GIT_AUTHOR}"
            }
        }

        stage('Backend: Install') {
            steps {
                dir('backend') {
                    sh '''
                        python3 -m venv venv
                        . venv/bin/activate
                        pip install --upgrade pip --quiet
                        pip install -r requirements.txt --quiet
                        pip install ruff --quiet
                    '''
                }
            }
        }

        stage('Backend: Lint') {
            steps {
                dir('backend') {
                    sh '''
                        . venv/bin/activate
                        ruff check app/ tests/
                        ruff format --check app/ tests/
                    '''
                }
            }
        }

        stage('Backend: Tests') {
            steps {
                dir('backend') {
                    sh '''
                        . venv/bin/activate
                        export DATABASE_URL=sqlite+aiosqlite:///./test.db
                        export REDIS_URL=redis://localhost:6379/0
                        export CELERY_BROKER_URL=redis://localhost:6379/0
                        export CELERY_RESULT_BACKEND=redis://localhost:6379/1
                        export ENV=test
                        pytest tests/ \
                            --cov=app \
                            --cov-report=xml:coverage.xml \
                            --junitxml=test-results.xml \
                            -v
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'backend/test-results.xml'
                }
            }
        }

        stage('Frontend: Install') {
            steps {
                dir('frontend') {
                    sh 'npm ci --silent'
                }
            }
        }

        stage('Frontend: Lint') {
            steps {
                dir('frontend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Frontend: Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'frontend/dist/**/*',
                                     fingerprint: true,
                                     allowEmptyArchive: true
                }
            }
        }

        stage('Docker: Build') {
            when {
                anyOf { branch 'main'; branch 'develop' }
            }
            steps {
                sh '''
                    docker build -t voiceforge-backend:${IMAGE_TAG}  -f backend/Dockerfile backend/
                    docker build -t voiceforge-worker:${IMAGE_TAG}   -f backend/Dockerfile.worker backend/
                    docker build -t voiceforge-frontend:${IMAGE_TAG} -f frontend/Dockerfile frontend/
                '''
            }
        }

    }

    post {
        success {
            emailext(
                to:       "${NOTIFY_EMAIL}",
                subject:  "✅ [VoiceForge] Build #${BUILD_NUMBER} PASSED — ${env.GIT_BRANCH}",
                mimeType: 'text/html',
                body:     """
                    <h2 style="color:#22c55e">✅ Build Passed</h2>
                    <table style="font-family:monospace">
                        <tr><td><b>Build</b></td><td>#${BUILD_NUMBER}</td></tr>
                        <tr><td><b>Branch</b></td><td>${env.GIT_BRANCH}</td></tr>
                        <tr><td><b>Commit</b></td><td>${env.GIT_COMMIT?.take(8)}</td></tr>
                        <tr><td><b>Author</b></td><td>${env.GIT_AUTHOR}</td></tr>
                        <tr><td><b>Message</b></td><td>${env.GIT_MESSAGE}</td></tr>
                        <tr><td><b>Duration</b></td><td>${currentBuild.durationString}</td></tr>
                    </table>
                    <br>
                    <a href="${BUILD_URL}" style="background:#22c55e;color:white;padding:8px 16px;border-radius:4px;text-decoration:none">
                        View Build
                    </a>
                """
            )
        }

        failure {
            emailext(
                to:       "${NOTIFY_EMAIL}",
                subject:  "❌ [VoiceForge] Build #${BUILD_NUMBER} FAILED — ${env.GIT_BRANCH}",
                mimeType: 'text/html',
                body:     """
                    <h2 style="color:#ef4444">❌ Build Failed</h2>
                    <table style="font-family:monospace">
                        <tr><td><b>Build</b></td><td>#${BUILD_NUMBER}</td></tr>
                        <tr><td><b>Branch</b></td><td>${env.GIT_BRANCH}</td></tr>
                        <tr><td><b>Commit</b></td><td>${env.GIT_COMMIT?.take(8)}</td></tr>
                        <tr><td><b>Author</b></td><td>${env.GIT_AUTHOR}</td></tr>
                        <tr><td><b>Message</b></td><td>${env.GIT_MESSAGE}</td></tr>
                        <tr><td><b>Failed Stage</b></td><td>${env.STAGE_NAME ?: 'Unknown'}</td></tr>
                    </table>
                    <br>
                    <a href="${BUILD_URL}console" style="background:#ef4444;color:white;padding:8px 16px;border-radius:4px;text-decoration:none">
                        View Console Output
                    </a>
                """
            )
        }

        unstable {
            emailext(
                to:      "${NOTIFY_EMAIL}",
                subject: "⚠️ [VoiceForge] Build #${BUILD_NUMBER} UNSTABLE — ${env.GIT_BRANCH}",
                body:    "Build unstable. See: ${BUILD_URL}"
            )
        }

        always {
            cleanWs()
        }
    }
}
