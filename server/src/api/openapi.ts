export const openApiDocumentConfig = {
    openapi: '3.0.0' as const,
    info: {
        title: 'My Bkper App API',
        version: '1.0.0',
        description: 'Public API routes exposed by this Bkper app.',
    },
    servers: [
        { url: 'https://my-app.bkper.app', description: 'Production' },
        { url: 'https://my-app-preview.bkper.app', description: 'Preview' },
        { url: 'http://localhost:8787', description: 'Local Worker' },
    ],
};
