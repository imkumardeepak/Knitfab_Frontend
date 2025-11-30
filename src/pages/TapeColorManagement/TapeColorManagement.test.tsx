import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TapeColorManagement from './index';

// Mock the hooks and components that are used in the TapeColorManagement component
vi.mock('@/hooks/queries', () => ({
  useTapeColors: () => ({
    data: [],
    isLoading: false,
    error: null
  }),
  useDeleteTapeColor: () => ({
    mutate: vi.fn(),
    isPending: false
  })
}));

vi.mock('@/lib/api-client', () => ({
  apiUtils: {
    handleError: vi.fn()
  }
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}));

vi.mock('@/components/DataTable', () => ({
  DataTable: () => <div data-testid="data-table">Data Table</div>
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  DeleteConfirmationDialog: () => <div data-testid="delete-dialog">Delete Dialog</div>
}));

describe('TapeColorManagement', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <TapeColorManagement />
      </BrowserRouter>
    );

    expect(screen.getByText('Tape Color Management')).toBeInTheDocument();
    expect(screen.getByText('Manage tape colors for production')).toBeInTheDocument();
  });

  it('displays the correct title and description', () => {
    render(
      <BrowserRouter>
        <TapeColorManagement />
      </BrowserRouter>
    );

    expect(screen.getByText('Tape Color Management')).toBeInTheDocument();
    expect(screen.getByText('Manage tape colors for production')).toBeInTheDocument();
  });

  it('renders the add button', () => {
    render(
      <BrowserRouter>
        <TapeColorManagement />
      </BrowserRouter>
    );

    expect(screen.getByText('Add Tape Color')).toBeInTheDocument();
  });
});