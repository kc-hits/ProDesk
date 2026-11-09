
import { createBrowserRouter } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';

import HomePage from '../pages/home/HomePage';
import Beats from '../pages/Beats/Beats';
import Producers from '../pages/Producers/Producers';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'beats',
        element: <Beats />,
      },
      {
        path: 'producers',
        element: <Producers />,
      },
    ],
  },

  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
]);

export default router;
