const fetch = require('node-fetch')


module.exports = class RESTAPI {
  constructor() {
  }

  resolveURL(request) {
    let path = request.path;
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    const baseURL = this.baseURL;
    if (baseURL) {
      const normalizedBaseURL = baseURL.endsWith('/')
        ? baseURL
        : baseURL.concat('/');
      return new URL(path, normalizedBaseURL);
    }
    else {
      return new URL(path);
    }
  }
  async didReceiveResponse(response, _request) {
    if (response.ok) {
      return this.parseBody(response);
    }
    else {
      throw await this.errorFromResponse(response);
    }
  }
  didEncounterError(error, _request) {
    throw error;
  }
  parseBody(response) {
    const contentType = response.headers.get('Content-Type')
    const contentLength = response.headers.get('Content-Length')
    if (
      response.status !== 204 &&
      contentLength !== '0' &&
      contentType &&
      (contentType.startsWith('application/json') ||
        contentType.startsWith('application/hal+json'))) {
      return response.json();
    }
    else {
      return response.text();
    }
  }
  async errorFromResponse(response) {
    const message = `${response.status}: ${response.statusText}`;
    let error;
    if (response.status === 401) {
      error = new Error(message);
    }
    else if (response.status === 403) {
      error = new Error(message);
    }
    else {
      error = new Error(message);
    }
    const body = await this.parseBody(response);
    Object.assign(error.extensions, {
      response: {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        body,
      },
    });
    return error;
  }
  async get(path, params, init) {
    return this.fetch(Object.assign({ method: 'GET', path, params }, init));
  }
  async post(path, body, init) {
    return this.fetch(Object.assign({ method: 'POST', path, body }, init));
  }
  async patch(path, body, init) {
    return this.fetch(Object.assign({ method: 'PATCH', path, body }, init));
  }
  async put(path, body, init) {
    return this.fetch(Object.assign({ method: 'PUT', path, body }, init));
  }
  async delete(path, params, init) {
    return this.fetch(Object.assign({ method: 'DELETE', path, params }, init));
  }
  async fetch(init) {
    if (!(init.params instanceof URLSearchParams)) {
      init.params = new URLSearchParams(init.params);
    }
    if (!(init.headers && init.headers)) {
      init.headers = Object.create({})
    }
    const options = init;
    if (this.willSendRequest) {
      await this.willSendRequest(options);
    }
    const url = await this.resolveURL(options);
    // Append params to existing params in the path
    for (const [name, value] of options.params) {
      url.searchParams.append(name, value);
    }
    // We accept arbitrary objects and arrays as body and serialize them as JSON
    if (options.body !== undefined &&
      options.body !== null &&
      (options.body.constructor === Object ||
        Array.isArray(options.body) ||
        (options.body.toJSON &&
          typeof options.body.toJSON === 'function'))) {
      options.body = JSON.stringify(options.body);
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }

    }
    return this.didReceiveResponse(await fetch(url, options))

  }
}