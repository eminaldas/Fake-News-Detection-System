from collections import namedtuple
from app.services.category_tree import build_category_tree

Cat = namedtuple("Cat", "id slug name parent_id display_order")


def test_tree_groups_subs_under_mains_in_order():
    rows = [
        Cat(1, "teknoloji", "Teknoloji", None, 0),
        Cat(2, "ekonomi",   "Ekonomi",   None, 1),
        Cat(3, "otomobil",  "Otomobil",  1,    2),
        Cat(4, "yazilim",   "Yazılım",   1,    3),
        Cat(5, "finans",    "Finans",    2,    4),
    ]
    tree = build_category_tree(rows)
    assert [m["slug"] for m in tree] == ["teknoloji", "ekonomi"]
    assert [s["slug"] for s in tree[0]["subcategories"]] == ["otomobil", "yazilim"]
    assert tree[1]["subcategories"][0]["slug"] == "finans"


def test_tree_main_without_subs_has_empty_list():
    rows = [Cat(1, "spor", "Spor", None, 0)]
    tree = build_category_tree(rows)
    assert tree[0]["subcategories"] == []


def test_orphan_sub_without_parent_is_skipped():
    rows = [Cat(3, "otomobil", "Otomobil", 99, 0)]  # parent 99 yok
    assert build_category_tree(rows) == []
