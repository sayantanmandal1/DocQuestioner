import { render, screen, fireEvent } from '../../../__tests__/test-utils';
import { usePathname } from 'next/navigation';
import Layout, { Container, Card, Grid } from '../Layout';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Layout', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders header with logo and title', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    
    expect(screen.getByText('AI Microservices')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Summarization')).toBeInTheDocument();
    expect(screen.getByText('Q&A')).toBeInTheDocument();
    expect(screen.getByText('Learning Path')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    mockUsePathname.mockReturnValue('/summarization');
    
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    
    const summarizationLink = screen.getAllByText('Summarization')[0].closest('a');
    expect(summarizationLink).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('toggles mobile menu', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    
    // Mobile menu should not be visible initially
    expect(screen.queryByText('Text summarization service')).not.toBeInTheDocument();
    
    // Click mobile menu button
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);
    
    // Mobile menu should now be visible
    expect(screen.getByText('Text summarization service')).toBeInTheDocument();
    
    // Click again to close
    fireEvent.click(menuButton);
    
    // Mobile menu should be hidden again
    expect(screen.queryByText('Text summarization service')).not.toBeInTheDocument();
  });

  it('closes mobile menu when navigation item is clicked', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    
    // Open mobile menu
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);
    
    // Click a navigation item
    const mobileNavItem = screen.getByText('Text summarization service').closest('a');
    fireEvent.click(mobileNavItem!);
    
    // Mobile menu should be closed
    expect(screen.queryByText('Text summarization service')).not.toBeInTheDocument();
  });

  it('renders footer', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    
    expect(screen.getByText('AI Microservices Platform')).toBeInTheDocument();
    expect(screen.getByText('Powered by OpenAI through OpenRouter')).toBeInTheDocument();
  });
});

describe('Container', () => {
  it('renders children with default size', () => {
    render(
      <Container>
        <div>Test content</div>
      </Container>
    );
    
    const container = screen.getByText('Test content').parentElement;
    expect(container).toHaveClass('max-w-6xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
  });

  it('renders with custom size', () => {
    render(
      <Container size="sm">
        <div>Test content</div>
      </Container>
    );
    
    const container = screen.getByText('Test content').parentElement;
    expect(container).toHaveClass('max-w-2xl');
  });

  it('applies custom className', () => {
    render(
      <Container className="custom-class">
        <div>Test content</div>
      </Container>
    );
    
    const container = screen.getByText('Test content').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});

describe('Card', () => {
  it('renders children with default styling', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    );
    
    const card = screen.getByText('Card content').parentElement;
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'border', 'border-gray-200', 'p-6', 'shadow-md');
  });

  it('renders with custom padding', () => {
    render(
      <Card padding="lg">
        <div>Card content</div>
      </Card>
    );
    
    const card = screen.getByText('Card content').parentElement;
    expect(card).toHaveClass('p-8');
  });

  it('renders with custom shadow', () => {
    render(
      <Card shadow="xl">
        <div>Card content</div>
      </Card>
    );
    
    const card = screen.getByText('Card content').parentElement;
    expect(card).toHaveClass('shadow-xl');
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-card">
        <div>Card content</div>
      </Card>
    );
    
    const card = screen.getByText('Card content').parentElement;
    expect(card).toHaveClass('custom-card');
  });
});

describe('Grid', () => {
  it('renders children with default grid', () => {
    render(
      <Grid>
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    
    const grid = screen.getByText('Item 1').parentElement;
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'gap-6');
  });

  it('renders with custom columns', () => {
    render(
      <Grid cols={3}>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Grid>
    );
    
    const grid = screen.getByText('Item 1').parentElement;
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('renders with custom gap', () => {
    render(
      <Grid gap="lg">
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    
    const grid = screen.getByText('Item 1').parentElement;
    expect(grid).toHaveClass('gap-8');
  });

  it('applies custom className', () => {
    render(
      <Grid className="custom-grid">
        <div>Item 1</div>
      </Grid>
    );
    
    const grid = screen.getByText('Item 1').parentElement;
    expect(grid).toHaveClass('custom-grid');
  });
});