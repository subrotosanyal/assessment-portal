import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, Container } from '@chakra-ui/react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Assignments from './pages/Assignments'
import AssignmentDetail from './pages/AssignmentDetail'
import theme from './theme'
import './styles.css'
import { initAntiCopy } from './antiCopy'
// Syntax highlighting styles for code blocks
import 'highlight.js/styles/github-dark.css'

const router = createBrowserRouter([
  { path: '/', element: <Container maxW="6xl"><Assignments/></Container> },
  { path: '/assignment/:id', element: <Container maxW="6xl"><AssignmentDetail/></Container> }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <RouterProvider router={router} />
    </ChakraProvider>
  </React.StrictMode>
)

// Initialize best-effort client-side anti-copy protections
initAntiCopy()
