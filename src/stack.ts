// @ts-ignore
const Me = imports.misc.extensionUtils.getCurrentExtension();

import type { Entity } from './ecs';
import type { Ext } from './extension';

import * as Ecs from 'ecs';

const { St } = imports.gi;

interface Component {
    entity: Entity;
    button: St.Widget;
}

export class Stack {
    private tabs = new St.BoxLayout({ style_class: 'pop-shell-stack' });

    active: Entity;

    windows: Array<Component> = new Array();

    constructor(active: Entity) {
        this.active = active;

        global.window_group.add_child(this.tabs);
        global.window_group.set_child_above_sibling(this.tabs, null);
        this.tabs.visible = true;
    }

    activate(entity: Entity) {
        for (const component of this.windows) {
            const name = Ecs.entity_eq(entity, component.entity)
                ? 'pop-shell-tab-active'
                : 'pop-shell-tab-inactive';
            component.button.set_style_class_name(name);
        }

        this.active = entity;
    }

    active_id(): number {
        return this.windows.findIndex((comp) => Ecs.entity_eq(comp.entity, this.active));
    }

    clear() {
        for (const window of this.windows.splice(0)) {
            this.tabs.remove_child(window.button);
        }
    }

    destroy() {
        global.window_group.remove_child(this.tabs);
        this.tabs.destroy();
    }

    update_positions(ext: Ext, dpi: number, rect: Rectangular) {
        global.log(`updating positions`);
        const width = 4 * dpi;
        const tabs_height = width * 6;
        this.tabs.x = rect.x;
        this.tabs.y = rect.y - tabs_height;
        this.tabs.width = rect.width;
        this.tabs.height = tabs_height;

        ext.register_fn(() => {
            for (const window of ext.windows.values()) {
                let actor = window.meta.get_compositor_private();
                if (!actor) continue;
                global.window_group.set_child_above_sibling(this.tabs, actor);
            }
        });
    }

    update_tabs(ext: Ext, data: Array<[Entity, string]>) {
        this.clear();

        this.windows.splice(0);

        this.tabs.destroy_all_children();

        for (const [entity, title] of data) {
            global.log(`adding tab ${title}`);
            const button = St.Button.new_with_label(title);
            button.x_expand = true;
            button.style_class = Ecs.entity_eq(entity, this.active)
                ? 'pop-shell-tab-active'
                : 'pop-shell-tab-inactive';

            button.connect('clicked', () => {
                const window = ext.windows.get(entity);
                if (window) {
                    if (window.actor_exists()) {
                        window.meta.raise();
                        this.activate(entity);
                    } else {
                        this.remove_tab(entity);
                    }
                }
            });

            this.windows.push({ entity, button });
            this.tabs.add_actor(button);
        }
    }

    remove_tab(entity: Entity) {
        let found = null;
        let idx = 0;
        for (const window of this.windows) {
            if (Ecs.entity_eq(window.entity, entity)) {
                found = idx;
                this.tabs.remove_child(window.button);
                break
            }
        }

        if (found !== null) {
            this.windows.splice(found, 1);
        }
    }

    set_visible(visible: boolean) {
        if (visible) {
            this.tabs.show();
        } else {
            this.tabs.hide();
        }
    }
}
