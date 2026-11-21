import { createBrowserRouter, createHashRouter, Navigate, RouterProvider } from 'react-router';
import { AtlasPage } from './routes/AtlasPage';

const routes = [
  { path: '/', element: <Navigate to="/memleket" replace /> },
  { path: '/demo', element: <Navigate to="/memleket" replace /> },
  { path: '/:atlas/:group?/:unit?', element: <AtlasPage /> },
  { path: '*', element: <Navigate to="/memleket" replace /> },
];

// Önizleme yayınlarında (tek dosya barındırma) adres çubuğu yerine # kullanılır
const router = import.meta.env.VITE_HASH_ROUTER === '1' ? createHashRouter(routes) : createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
