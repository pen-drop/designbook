import { describe, it, expect } from 'vitest';
import { resolveScreen } from '../resolver';
import type { ScreenDef } from '../types';
import type { DataModel, SampleData } from '../../entity/types';

// Shared test fixtures
const dataModel: DataModel = {
    content: {
        node: {
            article: {
                fields: {
                    title: { type: 'string' },
                    body: { type: 'text' },
                    field_media: { type: 'reference' },
                },
                view_modes: {
                    full: {
                        mapping: [
                            {
                                component: 'figure',
                                props: { src: '$field_media.url', alt: '$field_media.alt' },
                            },
                            {
                                component: 'heading',
                                props: { level: 'h1' },
                                slots: { text: '$title' },
                            },
                            {
                                component: 'text-block',
                                slots: { content: '$body' },
                            },
                        ],
                    },
                    teaser: {
                        mapping: [
                            {
                                component: 'heading',
                                props: { level: 'h3' },
                                slots: { text: '$title' },
                            },
                        ],
                    },
                },
            },
        },
        block_content: {
            contact_person: {
                fields: {
                    field_name: { type: 'string' },
                },
                view_modes: {
                    avatar: {
                        mapping: [
                            {
                                component: 'avatar',
                                slots: { name: '$field_name' },
                            },
                        ],
                    },
                },
            },
        },
    },
};

const sampleData: SampleData = {
    node: {
        article: [
            {
                title: 'First Article',
                body: '<p>Body content</p>',
                field_media: { url: '/img/photo.jpg', alt: 'Photo' },
            },
            {
                title: 'Second Article',
                body: '<p>Second body</p>',
                field_media: { url: '/img/photo2.jpg', alt: 'Photo 2' },
            },
            {
                title: 'Third Article',
                body: '<p>Third body</p>',
                field_media: { url: '/img/photo3.jpg', alt: 'Photo 3' },
            },
        ],
    },
    block_content: {
        contact_person: [
            { field_name: 'John Doe' },
        ],
    },
};

describe('resolveScreen', () => {
    it('resolves entity entries to component nodes', () => {
        const screen: ScreenDef = {
            name: 'Detail',
            section: 'blog',
            layout: {
                content: [
                    { entity: 'node.article', view_mode: 'full', record: 0 },
                ],
            },
        };

        const resolved = resolveScreen(screen, { dataModel, sampleData });

        expect(resolved.name).toBe('Detail');
        expect(resolved.slots.content).toHaveLength(3); // figure + heading + text-block
        expect(resolved.slots.content[0]).toEqual({
            type: 'component',
            component: 'figure',
            props: { src: '/img/photo.jpg', alt: 'Photo' },
        });
        expect(resolved.slots.content[1]).toEqual({
            type: 'component',
            component: 'heading',
            props: { level: 'h1' },
            slots: { text: 'First Article' },
        });
        expect(resolved.slots.content[2]).toEqual({
            type: 'component',
            component: 'text-block',
            slots: { content: '<p>Body content</p>' },
        });
    });

    it('applies provider prefix to entity components', () => {
        const screen: ScreenDef = {
            name: 'Detail',
            layout: {
                content: [
                    { entity: 'node.article', view_mode: 'teaser', record: 0 },
                ],
            },
        };

        const resolved = resolveScreen(screen, {
            dataModel,
            sampleData,
            provider: 'my_theme',
        });

        expect(resolved.slots.content[0].component).toBe('my_theme:heading');
    });

    it('applies provider prefix to component entries', () => {
        const screen: ScreenDef = {
            name: 'Test',
            layout: {
                header: [
                    { component: 'heading', props: { level: 'h1' }, slots: { text: 'Title' } },
                ],
            },
        };

        const resolved = resolveScreen(screen, {
            dataModel,
            sampleData,
            provider: 'my_theme',
        });

        expect(resolved.slots.header[0]).toEqual({
            type: 'component',
            component: 'my_theme:heading',
            props: { level: 'h1' },
            slots: { text: 'Title' },
        });
    });

    it('resolves multiple records into flat component array', () => {
        const screen: ScreenDef = {
            name: 'Listing',
            layout: {
                content: [
                    { entity: 'node.article', view_mode: 'teaser', record: 0 },
                    { entity: 'node.article', view_mode: 'teaser', record: 1 },
                    { entity: 'node.article', view_mode: 'teaser', record: 2 },
                ],
            },
        };

        const resolved = resolveScreen(screen, { dataModel, sampleData });

        // 3 records × 1 component each (teaser has only heading) = 3 nodes
        expect(resolved.slots.content).toHaveLength(3);
        expect(resolved.slots.content[0].slots).toEqual({ text: 'First Article' });
        expect(resolved.slots.content[1].slots).toEqual({ text: 'Second Article' });
        expect(resolved.slots.content[2].slots).toEqual({ text: 'Third Article' });
    });

    it('handles mixed component and entity entries', () => {
        const screen: ScreenDef = {
            name: 'Mixed',
            layout: {
                content: [
                    { component: 'heading', props: { level: 'h1' }, slots: { text: 'Blog' } },
                    { entity: 'node.article', view_mode: 'teaser', record: 0 },
                ],
            },
        };

        const resolved = resolveScreen(screen, { dataModel, sampleData });

        // 1 direct component + 1 resolved entity (1 component) = 2
        expect(resolved.slots.content).toHaveLength(2);
        expect(resolved.slots.content[0].component).toBe('heading');
        expect(resolved.slots.content[1].component).toBe('heading'); // from teaser mapping
    });

    it('preserves story property on component entries', () => {
        const screen: ScreenDef = {
            name: 'With Story',
            layout: {
                header: [
                    { component: 'header', story: 'default' },
                ],
            },
        };

        const resolved = resolveScreen(screen, { dataModel, sampleData });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((resolved.slots.header[0] as any).story).toBe('default');
    });

    it('throws on invalid entity path', () => {
        const screen: ScreenDef = {
            name: 'Bad Path',
            layout: {
                content: [
                    { entity: 'invalid', view_mode: 'full', record: 0 },
                ],
            },
        };

        expect(() => resolveScreen(screen, { dataModel, sampleData })).toThrow(
            'Invalid entity path'
        );
    });

    it('throws on missing entity in data model', () => {
        const screen: ScreenDef = {
            name: 'Missing Entity',
            layout: {
                content: [
                    { entity: 'node.page', view_mode: 'full', record: 0 },
                ],
            },
        };

        expect(() => resolveScreen(screen, { dataModel, sampleData })).toThrow(
            'not found in data model'
        );
    });

    it('throws on missing view mode', () => {
        const screen: ScreenDef = {
            name: 'Missing VM',
            layout: {
                content: [
                    { entity: 'node.article', view_mode: 'card', record: 0 },
                ],
            },
        };

        expect(() => resolveScreen(screen, { dataModel, sampleData })).toThrow(
            "View mode 'card' not defined"
        );
    });

    it('throws on missing record in sample data', () => {
        const screen: ScreenDef = {
            name: 'Missing Record',
            layout: {
                content: [
                    { entity: 'node.article', view_mode: 'full', record: 99 },
                ],
            },
        };

        expect(() => resolveScreen(screen, { dataModel, sampleData })).toThrow(
            'Record 99 not found'
        );
    });

    it('resolves multiple slots independently', () => {
        const screen: ScreenDef = {
            name: 'Multi-Slot',
            layout: {
                header: [
                    { component: 'heading', props: { level: 'h1' }, slots: { text: 'Title' } },
                ],
                content: [
                    { entity: 'node.article', view_mode: 'full', record: 0 },
                ],
                footer: [
                    { component: 'text-block', slots: { content: '© 2026' } },
                ],
            },
        };

        const resolved = resolveScreen(screen, { dataModel, sampleData });

        expect(Object.keys(resolved.slots)).toEqual(['header', 'content', 'footer']);
        expect(resolved.slots.header).toHaveLength(1);
        expect(resolved.slots.content).toHaveLength(3); // full = figure + heading + text-block
        expect(resolved.slots.footer).toHaveLength(1);
    });

    it('resolves nested entity reference in view mode slot', () => {
        // Add nested entity ref to a view mode mapping
        const nestedDataModel: DataModel = {
            content: {
                ...dataModel.content,
                node: {
                    article: {
                        ...dataModel.content.node.article,
                        view_modes: {
                            ...dataModel.content.node.article.view_modes,
                            with_contact: {
                                mapping: [
                                    {
                                        component: 'contact-card',
                                        slots: {
                                            avatar: {
                                                type: 'entity',
                                                entity_type: 'block_content',
                                                bundle: 'contact_person',
                                                view_mode: 'avatar',
                                                record: 0,
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        };

        const screen: ScreenDef = {
            name: 'Nested',
            layout: {
                content: [
                    { entity: 'node.article', view_mode: 'with_contact', record: 0 },
                ],
            },
        };

        const resolved = resolveScreen(screen, {
            dataModel: nestedDataModel,
            sampleData,
        });

        expect(resolved.slots.content).toHaveLength(1);
        const contactCard = resolved.slots.content[0];
        expect(contactCard.component).toBe('contact-card');
        // The avatar slot should be the resolved nested entity (avatar component array)
        expect(contactCard.slots?.avatar).toEqual([
            {
                type: 'component',
                component: 'avatar',
                slots: { name: 'John Doe' },
            },
        ]);
    });
});
