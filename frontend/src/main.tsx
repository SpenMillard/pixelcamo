import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DevWrapper } from './components/DevWrapper';
import './styles/main.css';

const root = createRoot(document.getElementById('root')!);

if (import.meta.env.DEV) {
  // Dev: include mock macOS chrome for visual parity with Pixelcamo.html
  root.render(
    <StrictMode>
      <DevWrapper docTitle="Untitled.pcm" dirty={false}>
        <App isDevWrapper />
      </DevWrapper>
    </StrictMode>,
  );
} else {
  // Production: bare app, pywebview provides OS chrome
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
