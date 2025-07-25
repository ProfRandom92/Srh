# SRH NFC Kontrollpunkte Demo

This repository contains a minimal Node.js application that serves an HTML
page displaying Google Maps markers for various control points on the SRH
campus. The Google Maps API key is read from the environment variable
`GOOGLE_MAPS_API_KEY`.

## Development

Install dependencies and start the server:

```bash
npm install
GOOGLE_MAPS_API_KEY=your-key npm start
```

The application will be available on http://localhost:3000.

## Deployment

The repository includes a GitHub Actions workflow (`azure-webapps-node.yml`)
for deploying to Azure Web Apps. Set the `AZURE_WEBAPP_PUBLISH_PROFILE`
secret in your repository and configure the `AZURE_WEBAPP_NAME` environment
variable in the workflow file.
