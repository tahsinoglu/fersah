import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, RouterProvider } from 'react-router';
import { AtlasPage } from './routes/AtlasPage';
import { Loading } from './ui/Loading';

// Harita dışındaki ekranlar ayrı parçalarda: ilk açılış daha hızlı
const named = <T extends Record<string, ComponentType<never>>>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] as ComponentType })));
const GamePage = named(() => import('./routes/GamePage'), 'GamePage') as ComponentType<{ daily?: boolean }>;
const HubPage = named(() => import('./routes/HubPage'), 'HubPage');
const StatsPage = named(() => import('./routes/StatsPage'), 'StatsPage');
const KidsLayout = named(() => import('./kids/KidsRoutes'), 'KidsLayout');
const KidsHome = named(() => import('./kids/KidsRoutes'), 'KidsHome');
const PuzzlePage = named(() => import('./kids/KidsRoutes'), 'PuzzlePage');
const FindPage = named(() => import('./kids/KidsRoutes'), 'FindPage');
const ExplorePage = named(() => import('./kids/KidsRoutes'), 'ExplorePage');

const s = (node: ReactNode) => <Suspense fallback={<Loading />}>{node}</Suspense>;

const routes = [
  { path: '/', element: <Navigate to="/memleket" replace /> },
  { path: '/demo', element: <Navigate to="/memleket" replace /> },
  { path: '/oyna', element: s(<HubPage />) },
  { path: '/istatistik', element: s(<StatsPage />) },
  { path: '/oyun/:atlas/:mode/:scope', element: s(<GamePage />) },
  { path: '/gunluk/:atlas', element: s(<GamePage daily />) },
  {
    path: '/cocuk',
    element: s(<KidsLayout />),
    children: [
      { index: true, element: s(<KidsHome />) },
      { path: 'yapboz/:atlas', element: s(<PuzzlePage />) },
      { path: 'bul/:atlas', element: s(<FindPage />) },
      { path: 'kesfet/:atlas', element: s(<ExplorePage />) },
      { path: '*', element: <Navigate to="/cocuk" replace /> },
    ],
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
