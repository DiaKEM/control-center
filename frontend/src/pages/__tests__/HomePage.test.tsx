import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setCredentials } from '@/features/auth/authSlice';
import { authApi } from '@/features/auth/authApi';
import Navbar from '@/components/layout/Navbar';

function createAuthenticatedStore(username = 'testuser') {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
  store.dispatch(setCredentials({ token: 'fake-token', username }));
  return store;
}

function renderNavbar(username?: string) {
  const store = createAuthenticatedStore(username);
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>,
    ),
  };
}

describe('Navbar', () => {
  it('renders the app logo', () => {
    renderNavbar();
    expect(screen.getByText('Diakem Notify')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderNavbar();
    expect(
      screen.getByRole('link', { name: /job configurations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /job executions/i }),
    ).toBeInTheDocument();
  });

  it('displays the username in the user menu trigger', () => {
    renderNavbar('Alice');
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('dispatches logout when logout menu item is clicked', async () => {
    const user = userEvent.setup();
    const { store } = renderNavbar();

    expect(store.getState().auth.isAuthenticated).toBe(true);

    // Open the dropdown
    await user.click(screen.getByRole('button', { name: /alice|testuser/i }));
    await user.click(screen.getByRole('menuitem', { name: /logout/i }));

    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
