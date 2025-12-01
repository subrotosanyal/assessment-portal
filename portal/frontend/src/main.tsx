import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/Home'
import AssignmentDetail from './pages/AssignmentDetail'
import theme from './theme'
import './styles.css'
import AppLayout from './pages/AppLayout'
import { RoleProvider } from './role'
// Syntax highlighting styles for code blocks
import 'highlight.js/styles/github-dark.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: '/assignment/:id', element: <AssignmentDetail /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <RoleProvider>
        <RouterProvider router={router} />
      </RoleProvider>
    </ChakraProvider>
  </React.StrictMode>
)
