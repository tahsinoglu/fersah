import { createBrowserRouter, createMemoryRouter, Navigate, RouterProvider } from 'react-router';
import { AtlasPage } from './routes/AtlasPage';

const routes = [
  { path: '/', element: <Navigate to="/memleket" replace /> },
  { path: '/demo', element: <Navigate to="/memleket" replace /> },
  { path: '/:atlas/:group?/:unit?', element: <AtlasPage /> },
  { path: '*', element: <Navigate to="/memleket" replace /> },
];

// Önizleme yayınında (tek dosya, çerçeve içinde) adres çubuğu kullanılamaz; gezinme bellekte tutulur
const router =
  import.meta.env.VITE_PREVIEW === '1'
    ? createMemoryRouter(routes, { initialEntries: ['/memleket'] })
    : createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
