"""
app/services/category_tree.py
=============================
Düz kategori listesini ana->alt ağaç sözlüğüne çevirir (saf, DB bağımsız).
"""


def build_category_tree(categories) -> list[dict]:
    """categories: id, slug, name, parent_id, display_order alanlı objeler.
    Dönen: [{slug, name, subcategories:[{slug, name}]}] — display_order sıralı."""
    ordered = sorted(categories, key=lambda c: c.display_order)
    mains = [c for c in ordered if c.parent_id is None]
    main_ids = {c.id for c in mains}

    nodes = {c.id: {"slug": c.slug, "name": c.name, "subcategories": []} for c in mains}
    for c in ordered:
        if c.parent_id is not None and c.parent_id in main_ids:
            nodes[c.parent_id]["subcategories"].append({"slug": c.slug, "name": c.name})
    return [nodes[c.id] for c in mains]
