from scripts.eval_claim_retrieval import score_retrieval


def test_all_expected_found_scores_one():
    result = score_retrieval(
        found_entity_keys=["PERSON::mehmet_simsek", "LOCATION::ankara"],
        expected_entities=["PERSON::mehmet_simsek"],
    )
    assert result == {"hit": True}


def test_none_found_scores_miss():
    result = score_retrieval(found_entity_keys=[], expected_entities=["PERSON::mehmet_simsek"])
    assert result == {"hit": False}


def test_partial_overlap_still_counts_as_hit():
    # En az bir beklenen varlık bulunduysa hit (find_precedent_claims'in "en az bir ortak
    # varlık" semantiğiyle tutarlı, bkz. spec §7)
    result = score_retrieval(
        found_entity_keys=["LOCATION::iran"],
        expected_entities=["LOCATION::iran", "LOCATION::bahreyn"],
    )
    assert result == {"hit": True}
