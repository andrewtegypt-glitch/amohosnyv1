import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import App from './App.tsx';
import './index.css';

function FirebaseTestProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseTestProvider>
      <App />
    </FirebaseTestProvider>
  </StrictMode>,
);

