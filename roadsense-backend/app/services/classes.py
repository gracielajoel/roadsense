"""
Pemetaan kelas model YOLO -> kode kerusakan RDD2022 (D00/D10/D20/D40).

Model RoadSense menyimpan nama kelas lengkap:
    0 Longitudinal Crack | 1 Transverse Crack | 2 Alligator Crack | 3 Pothole
Database & API memakai kode: D00, D10, D20, D40.
"""

CLASS_NAME_TO_CODE = {
    "longitudinal crack": "D00",
    "transverse crack": "D10",
    "alligator crack": "D20",
    "pothole": "D40",
}

# Cadangan kalau names tidak tersedia. Urutan = urutan kelas saat training.
INDEX_TO_CODE = {0: "D00", 1: "D10", 2: "D20", 3: "D40"}

VALID_CODES = frozenset(INDEX_TO_CODE.values())


def _normalize(name: str) -> str:
    return " ".join(str(name).replace("_", " ").replace("-", " ").lower().split())


def _code_from_name(name: str) -> str:
    key = _normalize(name)
    if key in CLASS_NAME_TO_CODE:
        return CLASS_NAME_TO_CODE[key]
    if key.upper() in VALID_CODES:  # nama kelas ternyata sudah berupa kode
        return key.upper()
    raise ValueError(f"Nama kelas tidak dikenal: {name!r}")


def to_damage_code(cls_id: int, names: dict | list | None = None) -> str:
    """
    Ubah index kelas dari model menjadi kode kerusakan.
    Kalau `names` (model.names) diberikan, pemetaan memakai NAMA kelas, bukan index,
    jadi tetap benar walau urutan kelas di model berubah.
    """
    cls_id = int(cls_id)
    if names is not None:
        try:
            name = names[cls_id]
        except (KeyError, IndexError):
            raise ValueError(f"Index kelas {cls_id} tidak ada di names model") from None
        return _code_from_name(name)
    try:
        return INDEX_TO_CODE[cls_id]
    except KeyError:
        raise ValueError(f"Index kelas {cls_id} tidak dikenal (harus 0-3)") from None


def validate_model_classes(names: dict | list) -> dict[int, str]:
    """
    Panggil SEKALI saat model dimuat. Memastikan model punya tepat 4 kelas yang dikenal.
    Return peta index -> kode, mis. {0: 'D00', 1: 'D10', 2: 'D20', 3: 'D40'}.
    """
    items = names.items() if isinstance(names, dict) else enumerate(names)
    mapping = {int(i): _code_from_name(n) for i, n in items}
    if set(mapping.values()) != set(VALID_CODES) or len(mapping) != len(VALID_CODES):
        raise ValueError(f"Kelas model tidak sesuai (D00/D10/D20/D40): {mapping}")
    return mapping
