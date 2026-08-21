import { Toaster } from "sileo";

import AppRouter from "./app/router/AppRouter";

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <AppRouter />
    </>
  );
}

export default App;