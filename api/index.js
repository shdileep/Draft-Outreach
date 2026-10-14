export default async function handler(req, res) {
  try {
    const { default: app } = await import('../server/server.js');
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      error: 'Caught startup error in api/index.js',
      message: err.message,
      stack: err.stack
    });
  }
}
