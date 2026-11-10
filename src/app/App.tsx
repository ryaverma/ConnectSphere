import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AppProvider } from './contexts/AppContext';
import { router } from './routes';

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}
