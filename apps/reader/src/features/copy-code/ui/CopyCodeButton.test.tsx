// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CopyCodeButton } from './CopyCodeButton';

describe('CopyCodeButton', () => {
  it('copies the code and announces it', async () => {
    const user = userEvent.setup();
    render(<CopyCodeButton code="const a = 1;" />);
    await user.click(screen.getByRole('button', { name: 'Kodu kopyala' }));
    expect(await navigator.clipboard.readText()).toBe('const a = 1;');
    expect(screen.getByText('Kopyalandı')).toBeInTheDocument();
  });
});
