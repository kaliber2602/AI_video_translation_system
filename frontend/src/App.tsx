import { Toaster } from "sileo";

import AppRouter from "./app/router/AppRouter";
import { NotificationProvider } from "./app/providers/NotificationContext";

function App() {
  return (
    <NotificationProvider>
      <Toaster position="top-center" />
      <AppRouter />
    </NotificationProvider>
  );
}

export default App;