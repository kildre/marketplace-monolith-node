# SonarQube Local Testing Setup

## Overview
This project is configured with SonarQube for code quality and security analysis. The configuration matches the pipeline setup for consistent results between local and CI/CD environments.

## Prerequisites
- Node.js and npm installed
- Access to SonarQube server: https://sonarqube.cdao.us
- SonarQube authentication token

## Getting Your SonarQube Token
1. Go to https://sonarqube.cdao.us/account/security
2. Generate a new token (or use existing one)
3. Copy the token value

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Authentication
Create a `.env.sonar` file (or set environment variable):
```bash
cp .env.sonar.example .env.sonar
# Edit .env.sonar and add your SONAR_TOKEN
```

Or export directly:
```bash
export SONAR_TOKEN=your-token-here
```

## Running SonarQube Analysis Locally

### Basic Scan (without branch)
```bash
npm run sonar:local
```

### Scan with Current Branch
```bash
npm run sonar:branch
```

### With Coverage Report
```bash
# First, run tests with coverage
npm run test:coverage

# Then run SonarQube scan
npm run sonar:local
```

## Configuration Files

### `sonar-project.properties`
Main configuration file that defines:
- Project key: `tenant-metrostar-advana-marketplace-monolith-node`
- Source directories
- Exclusions (node_modules, test files, etc.)
- Code coverage paths
- Analysis settings

### Key Settings
- **Sources**: All source files (excluding node_modules, dist, build, coverage)
- **Tests**: `src/test` directory
- **Coverage**: Jest coverage reports in `coverage/lcov.info`
- **Exclusions**: Test files, migrations, logs

## Understanding the Results

### Pipeline Issues Found
Based on your pipeline output, the following issues were detected:

#### OWASP 2021 Top 10
**Vulnerabilities:**
- Identification and Authentication Failures

**Security Hotspots (to review):**
- Cryptographic Failures
- Injection
- Security Misconfiguration

#### OWASP 2017 Top 10
**Vulnerabilities:**
- Sensitive Data Exposure

**Security Hotspots:**
- Injection
- Sensitive Data Exposure

### Viewing Results
After running the scan, view results at:
https://sonarqube.cdao.us/dashboard?id=tenant-metrostar-advana-marketplace-monolith-node

## Common Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run SonarQube scan locally
npm run sonar:local

# Run SonarQube scan with branch name
npm run sonar:branch

# Run both tests and scan
npm run test:coverage && npm run sonar:local
```

## Troubleshooting

### Authentication Issues
- Ensure SONAR_TOKEN is set correctly
- Verify token has not expired
- Check network access to https://sonarqube.cdao.us

### Coverage Not Showing
- Run `npm run test:coverage` first
- Verify `coverage/lcov.info` file exists
- Check Jest is configured to output LCOV format

### Encoding Warnings
If you see encoding warnings, the scanner will analyze files as UTF-8 by default (configured in sonar-project.properties).

## CI/CD Integration
The pipeline automatically runs SonarQube analysis on every push. Local testing helps you:
- Catch issues before pushing
- Debug specific quality gate failures
- Test configuration changes
- Review security hotspots locally

## Next Steps
1. Run your first local scan to see the same issues the pipeline found
2. Review the security hotspots and vulnerabilities in the SonarQube dashboard
3. Address the critical issues (especially OWASP vulnerabilities)
4. Re-run the scan to verify fixes
