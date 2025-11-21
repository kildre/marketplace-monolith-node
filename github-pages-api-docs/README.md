# GitHub Pages API Documentation

This project sets up a GitHub Pages site to render the API contract defined in `docs/APIcontract.yaml` using Redoc for enhanced visibility and layout.

## Project Structure

```
github-pages-api-docs
├── docs
│   ├── index.html          # Main entry point for the GitHub Pages site
│   └── APIcontract.yaml    # OpenAPI specification for the API contract
├── .github
│   └── workflows
│       └── deploy.yml      # GitHub Actions workflow for deployment
└── README.md               # Project documentation
```

## Getting Started

To view the API documentation:

1. Clone the repository to your local machine.
2. Navigate to the `docs` directory.
3. Open `index.html` in your web browser.

## Deployment

The documentation site is automatically deployed to GitHub Pages using GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`. Any changes pushed to the main branch will trigger the deployment process.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the API documentation or the project structure.