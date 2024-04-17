import "./App.css";

import { ContextProvider } from "./contexts/ContextProvider";
import("@solana/wallet-adapter-react-ui/styles.css");
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Tokens from "./pages/Tokens";
import TokenCreator from "./pages/TokenCreator";
import Navbar from "./components/NavBar";
import TokenManager from "./pages/TokenManager";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
const colors = {
  brand: {
    900: "#1a365d",
    800: "#153e75",
    700: "#2a69ac",
  },
};
const theme = extendTheme({ colors });
function App() {
  return (
    <>
      <ChakraProvider theme={theme}>
        <ContextProvider>
          <Navbar />
          <div style={{ padding: 30 }}>
            <Router>
              <Routes>
                <Route path="/" element={<TokenCreator />} />
                <Route path="/tokens" element={<Tokens />} />
                <Route path="/tokens/create" element={<TokenCreator />} />
                <Route path="/tokens/manage" element={<TokenManager />} />
              </Routes>
            </Router>
          </div>
        </ContextProvider>
      </ChakraProvider>
    </>
  );
}

export default App;
