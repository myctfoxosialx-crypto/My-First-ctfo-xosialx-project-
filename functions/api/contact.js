export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  let formData = {};

  if (contentType.includes('application/json')) {
    formData = await request.json().catch(() => ({}));
  } else {
    const body = await request.formData().catch(() => null);
    if (body) {
      for (const [key, value] of body.entries()) {
        formData[key] = value instanceof File ? value.name : value;
      }
    }
  }

  const name = String(formData.name || '').trim();
  const email = String(formData.email || '').trim();
  const product = String(formData.product || '').trim();
  const message = String(formData.message || '').trim();

  const errors = [];
  if (!name) errors.push('Name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
  if (!message) errors.push('Please include a short message.');

  if (errors.length > 0) {
    return new Response(
      JSON.stringify({
        success: false,
        message: errors.join(' '),
      }),
      {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  const payload = {
    name,
    email,
    product,
    message,
    submittedAt: new Date().toISOString(),
    source: 'ctfo-xosialx-site',
    mode: env.WEBHOOK_URL || env.CONTACT_EMAIL ? 'configured' : 'public-default',
  };

  const requestId = `ctfo-${Date.now().toString(36)}`;

  if (env.WEBHOOK_URL) {
    try {
      const webhookResponse = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'ctfo-xosialx-pages-function',
        },
        body: JSON.stringify({ ...payload, requestId }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook rejected with status ${webhookResponse.status}`);
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'The form was validated, but the delivery target rejected the message. Please configure your webhook or contact email in Cloudflare.',
          error: error instanceof Error ? error.message : 'Unknown webhook error',
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Thank you! Your inquiry has been received. We will follow up soon.',
      requestId,
      demoMode: !env.WEBHOOK_URL && !env.CONTACT_EMAIL,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
