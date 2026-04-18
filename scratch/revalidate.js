
const revalidate = async () => {
  const secret = 'tachibana2026-revalidate-secret'
  const url = `http://localhost:3000/api/revalidate?secret=${secret}` // Local dev
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: ['/lost-found'] })
    })
    const text = await response.text()
    console.log('Status:', response.status)
    console.log('Result:', text)
  } catch (e) {
    // If dev server is not running locally, this might fail, 
    // but in a real environment it would be triggered by HQDashboard.
    console.error('Fetch failed (is dev server running?):', e.message)
  }
}

revalidate()
