export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = env.SERVER_TRACKER.idFromName("global-state");
    const stub = env.SERVER_TRACKER.get(id);
    if (url.pathname === "/") {
      return stub.fetch(new Request(url, { headers: { "X-View": "true" } }));
    }
    return stub.fetch(request);
  }
};
export class ServerTracker {
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("X-View") === "true") {
      const allData = await this.state.storage.list({ prefix: "server:" });
      let rows = "";
      for (const [key, server] of allData) {
        rows += `
          <div style="border: 1px solid #444; margin: 10px; padding: 10px; border-radius: 8px; background: #1e1e1e;">
            <strong style="color: #a29bfe;">${server.bestName} (${server.bestGen})</strong><br>
            <small>Job: ${server.jobId} | Players: ${server.players}</small><br>
            <pre style="font-size: 12px; color: #ccc;">${server.content}</pre>
          </div>`;
      }
      const html = `
        <html>
          <head><title>Active Servers</title></head>
          <body style="background: #121212; color: white; font-family: sans-serif; padding: 20px;">
            <h2>Active Servers</h2>
            ${rows || "<p>No active servers reported in the last 60 seconds.</p>"}
            <script>setTimeout(() => location.reload(), 15000);</script>
          </body>
        </html>`;
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }
    const params = url.searchParams;
    const jobId = params.get("job");
    if (!jobId) return new Response("OK", { status: 200 });
    const serverData = {
      jobId: jobId,
      players: params.get("playing"),
      bestName: params.get("maxName"),
      bestGen: params.get("maxGen"),
      content: params.get("brainrots"),
      timestamp: Date.now()
    };
    await this.state.storage.put(`server:${jobId}`, serverData);
    await this.state.storage.setAlarm(Date.now() + 60000);

    return new Response("Logged", { status: 200 });
  }
  async alarm() {
    const now = Date.now();
    const allData = await this.state.storage.list({ prefix: "server:" });
    for (const [key, value] of allData) {
      if (now - value.timestamp > 60000) {
        await this.state.storage.delete(key);
      }
    }
  }
}
