import { extendTheme } from '@chakra-ui/react'

// Define a global theme that uses Aptos font for body and headings.
// If Aptos isn't available, fall back to system fonts.
const fonts = {
  heading: `Aptos, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"`,
  body: `Aptos, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"`,
}

const theme = extendTheme({ fonts })

export default theme
