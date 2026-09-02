import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ArticleCard } from '@/components/ArticleCard';
import {
  articleFixture,
  articleWithImageFixture,
} from '../../test/fixtures/articles';

describe('<ArticleCard />', () => {
  it('renders the title as a heading', () => {
    render(<ArticleCard article={articleFixture} />);

    expect(
      screen.getByRole('heading', { name: articleFixture.title }),
    ).toBeInTheDocument();
  });

  it('links to the article route', () => {
    render(<ArticleCard article={articleFixture} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/articles/decoupling-drupal',
    );
  });

  it('normalises a bare slug into the /articles/ route', () => {
    render(
      <ArticleCard article={{ ...articleFixture, slug: 'bare-slug' }} />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/articles/bare-slug',
    );
  });

  it('renders the image with its alt text when the article has one', () => {
    render(<ArticleCard article={articleWithImageFixture} />);

    const img = screen.getByRole('img', {
      name: 'A wall of server racks',
    });
    expect(img).toHaveAttribute('src', 'https://images.example.com/hero.jpg');
  });

  it('falls back to the title when the image has no alt text', () => {
    render(
      <ArticleCard
        article={{
          ...articleWithImageFixture,
          image: { ...articleWithImageFixture.image!, alt: '' },
        }}
      />,
    );

    expect(
      screen.getByRole('img', { name: articleWithImageFixture.title }),
    ).toBeInTheDocument();
  });

  it('renders a decorative placeholder instead of an image when there is none', () => {
    const { container } = render(<ArticleCard article={articleFixture} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden]')).toBeInTheDocument();
  });

  it('exposes the machine-readable publication date', () => {
    const { container } = render(<ArticleCard article={articleFixture} />);

    expect(container.querySelector('time')).toHaveAttribute(
      'dateTime',
      articleFixture.createdAt,
    );
  });
});
