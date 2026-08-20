import axios from "axios";

console.log(
  "%c[AXIOS] Initializing Axios",
  "color: purple; font-weight: bold;"
);

console.log(
  "[AXIOS] VITE_API_BASE_URL:",
  import.meta.env.VITE_API_BASE_URL
);

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000",

  timeout: 10000,

  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    console.log(
      "%c========== AXIOS REQUEST ==========",
      "color: blue; font-weight: bold;"
    );

    console.log(
      "[AXIOS] Method:",
      config.method?.toUpperCase()
    );

    console.log(
      "[AXIOS] Base URL:",
      config.baseURL
    );

    console.log(
      "[AXIOS] URL:",
      config.url
    );

    console.log(
      "[AXIOS] Full URL:",
      `${config.baseURL}${config.url}`
    );

    console.log(
      "[AXIOS] Headers:",
      config.headers
    );

    console.log(
      "[AXIOS] Data:",
      config.data
    );

    return config;
  },
  (error) => {
    console.error(
      "[AXIOS] Request interceptor error:",
      error
    );

    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(
      "%c========== AXIOS RESPONSE ==========",
      "color: green; font-weight: bold;"
    );

    console.log(
      "[AXIOS] Status:",
      response.status
    );

    console.log(
      "[AXIOS] URL:",
      response.config.url
    );

    console.log(
      "[AXIOS] Data:",
      response.data
    );

    return response;
  },
  (error) => {
    console.error(
      "%c========== AXIOS ERROR ==========",
      "color: red; font-weight: bold;"
    );

    console.error(
      "[AXIOS] Error:",
      error
    );

    console.error(
      "[AXIOS] Code:",
      error?.code
    );

    console.error(
      "[AXIOS] Message:",
      error?.message
    );

    console.error(
      "[AXIOS] Response:",
      error?.response
    );

    console.error(
      "[AXIOS] Request:",
      error?.request
    );

    return Promise.reject(error);
  }
);

export default api;