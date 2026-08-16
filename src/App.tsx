import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './routes/AppRouter';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
