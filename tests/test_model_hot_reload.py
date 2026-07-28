import workers.tasks as t


def test_reload_skipped_when_mtime_unchanged(monkeypatch):
    t.classifier_model_version = "100"
    monkeypatch.setattr(t.os.path, "getmtime", lambda path: 100.0)

    def _fail_if_called():
        raise AssertionError("_load_classifier çağrılmamalıydı — mtime değişmedi")

    monkeypatch.setattr(t, "_load_classifier", _fail_if_called)

    t._maybe_reload_classifier()  # exception atmazsa test geçer


def test_reload_triggered_when_mtime_changed(monkeypatch):
    t.classifier_model_version = "100"
    monkeypatch.setattr(t.os.path, "getmtime", lambda path: 200.0)

    called = {"count": 0}

    def _fake_reload():
        called["count"] += 1
        t.classifier_model_version = "200"

    monkeypatch.setattr(t, "_load_classifier", _fake_reload)

    t._maybe_reload_classifier()

    assert called["count"] == 1
    assert t.classifier_model_version == "200"


def test_reload_swallows_missing_file_error(monkeypatch):
    def _raise_oserror(path):
        raise OSError("dosya yok")

    monkeypatch.setattr(t.os.path, "getmtime", _raise_oserror)

    t._maybe_reload_classifier()  # OSError'ı yutup sessizce dönmeli, patlamamalı


def test_reload_failure_keeps_previous_model(monkeypatch):
    """Yeni .pkl bozuksa eski model belleğe yüklenmiş halde kalmalı, worker çökmemeli."""
    t.classifier_model_version = "100"
    monkeypatch.setattr(t.os.path, "getmtime", lambda path: 200.0)

    def _broken_reload():
        raise ValueError("bozuk pickle dosyası")

    monkeypatch.setattr(t, "_load_classifier", _broken_reload)

    t._maybe_reload_classifier()  # exception dışarı sızmamalı

    assert t.classifier_model_version == "100"  # eski sürüm bilgisi korunmalı
