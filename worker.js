export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    return res;
  },
};
