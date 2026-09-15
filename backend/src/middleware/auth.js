// Simple auth middleware — for demo, user ID is passed directly.
// In production, replace with proper JWT verification.
export function requireAuth(req, res, next) {
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized — provide x-user-id header' });
  req.userId = userId;
  next();
}
