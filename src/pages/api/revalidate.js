export default async function handler(req, res) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const { paths } = req.body;

    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json({ message: 'Paths array is required' });
    }

    // Revalidate each path
    const revalidatePromises = paths.map((path) => res.revalidate(path));
    await Promise.all(revalidatePromises);

    return res.json({ revalidated: true, paths });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send('Error revalidating');
  }
}
