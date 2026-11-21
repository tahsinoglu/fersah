import { lazy, Suspense } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, RouterProvider } from 'react-router';
import { AtlasPage } from './routes/AtlasPage';
import { GamePage } from './routes/GamePage';
import { HubPage } from './routes/HubPage';
import { StatsPage } from './routes/StatsPage';
import { Loading } from './ui/Loading';

const KidsRoutes = lazy(() => import('./kids/KidsRoutes'));

const routes = [
  { path: '/', element: <Navigate to="/memleket" replace /> },
  { path: '/demo', element: <Navigate to="/memleket" replace /> },
  { path: '/oyna', element: <HubPage /> },
  { path: '/istatistik', element: <StatsPage /> },
  { path: '/oyun/:atlas/:mode/:scope', element: <GamePage /> },
  { path: '/gunluk/:atlas', element: <GamePage daily /> },
  {
    path: '/cocuk/*',
    element: (
      <Suspense fallback={<Loading />}>
        <KidsRoutes />
      </Suspense>
    ),
  },
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
