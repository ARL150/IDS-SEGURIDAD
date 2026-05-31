"""
IDS Institucional - Identificación de dispositivos por MAC y hostname
"""

# ── Base de datos OUI (primeros 6 caracteres del MAC sin separadores) ──────────
OUI_DB: dict[str, tuple[str, str]] = {
    # (Fabricante, Tipo: phone|laptop|desktop|router|ap|iot|tv|gaming|printer|vm|server|unknown)

    # Apple
    "000393": ("Apple", "laptop"),    "000502": ("Apple", "laptop"),
    "000A27": ("Apple", "laptop"),    "000A95": ("Apple", "laptop"),
    "000D93": ("Apple", "laptop"),    "001124": ("Apple", "laptop"),
    "001451": ("Apple", "laptop"),    "0016CB": ("Apple", "laptop"),
    "001731": ("Apple", "laptop"),    "001B63": ("Apple", "laptop"),
    "001E52": ("Apple", "laptop"),    "001EC2": ("Apple", "phone"),
    "001F5B": ("Apple", "laptop"),    "001FF3": ("Apple", "phone"),
    "0021E9": ("Apple", "laptop"),    "002312": ("Apple", "phone"),
    "002332": ("Apple", "laptop"),    "002436": ("Apple", "laptop"),
    "0025BC": ("Apple", "laptop"),    "002608": ("Apple", "laptop"),
    "00264A": ("Apple", "laptop"),    "3C0754": ("Apple", "phone"),
    "3C2EFF": ("Apple", "phone"),     "3894ED": ("Apple", "phone"),
    "3C15C2": ("Apple", "laptop"),    "44D884": ("Apple", "phone"),
    "48A195": ("Apple", "laptop"),    "4C57CA": ("Apple", "laptop"),
    "50EA33": ("Apple", "phone"),     "6CF049": ("Apple", "phone"),
    "78CA39": ("Apple", "phone"),     "7C6D62": ("Apple", "phone"),
    "8C8590": ("Apple", "laptop"),    "90B21F": ("Apple", "phone"),
    "98014A": ("Apple", "laptop"),    "A85E45": ("Apple", "laptop"),
    "A8FAD8": ("Apple", "phone"),     "AC3C0B": ("Apple", "phone"),
    "B065BD": ("Apple", "phone"),     "B4F61C": ("Apple", "phone"),
    "BC9FEF": ("Apple", "laptop"),    "C091F1": ("Apple", "phone"),
    "C82A14": ("Apple", "phone"),     "D0E140": ("Apple", "phone"),
    "D4619D": ("Apple", "phone"),     "DC2B2A": ("Apple", "phone"),
    "E0B52D": ("Apple", "laptop"),    "E4E4AB": ("Apple", "phone"),
    "F0B479": ("Apple", "laptop"),    "F40F24": ("Apple", "phone"),
    "F81EDF": ("Apple", "phone"),     "FCFCE3": ("Apple", "phone"),

    # Samsung
    "001599": ("Samsung", "phone"),   "002454": ("Samsung", "phone"),
    "0025A3": ("Samsung", "phone"),   "002637": ("Samsung", "phone"),
    "0026E2": ("Samsung", "phone"),   "002839": ("Samsung", "phone"),
    "00E064": ("Samsung", "tv"),      "147590": ("Samsung", "phone"),
    "1C62B8": ("Samsung", "phone"),   "200DB0": ("Samsung", "phone"),
    "24920E": ("Samsung", "phone"),   "28987B": ("Samsung", "phone"),
    "2C0E3D": ("Samsung", "phone"),   "309BDE": ("Samsung", "phone"),
    "34145F": ("Samsung", "phone"),   "38AA3C": ("Samsung", "phone"),
    "40B395": ("Samsung", "phone"),   "54880E": ("Samsung", "phone"),
    "6CBF6B": ("Samsung", "phone"),   "78D6F0": ("Samsung", "phone"),
    "8CE9B4": ("Samsung", "phone"),   "94D7714": ("Samsung", "tv"),
    "A06090": ("Samsung", "phone"),   "B4EF39": ("Samsung", "phone"),
    "C87F54": ("Samsung", "phone"),   "CC07AB": ("Samsung", "phone"),
    "F025B7": ("Samsung", "phone"),   "F4428F": ("Samsung", "phone"),

    # Xiaomi
    "0C1DAF": ("Xiaomi", "phone"),    "18599F": ("Xiaomi", "phone"),
    "28E31F": ("Xiaomi", "phone"),    "3480B3": ("Xiaomi", "phone"),
    "40AC89": ("Xiaomi", "phone"),    "50EC50": ("Xiaomi", "iot"),
    "642737": ("Xiaomi", "phone"),    "74D2B9": ("Xiaomi", "phone"),
    "8CBEBE": ("Xiaomi", "phone"),    "ACC3B8": ("Xiaomi", "phone"),
    "D4970B": ("Xiaomi", "phone"),    "E4A7C5": ("Xiaomi", "phone"),
    "F0B429": ("Xiaomi", "phone"),    "FC64BA": ("Xiaomi", "phone"),

    # Huawei
    "001E10": ("Huawei", "phone"),    "002569": ("Huawei", "router"),
    "00259E": ("Huawei", "router"),   "0026181": ("Huawei", "phone"),
    "285FDB": ("Huawei", "phone"),    "2C9D1E": ("Huawei", "phone"),
    "34A84E": ("Huawei", "phone"),    "40CB00": ("Huawei", "phone"),
    "48FD8E": ("Huawei", "phone"),    "4C1FAA": ("Huawei", "router"),
    "5C8D4E": ("Huawei", "phone"),    "68A09E": ("Huawei", "phone"),
    "70726D": ("Huawei", "phone"),    "889B39": ("Huawei", "phone"),
    "90E7C4": ("Huawei", "phone"),    "A4A9AD": ("Huawei", "phone"),
    "C80E77": ("Huawei", "phone"),    "D46A35": ("Huawei", "router"),
    "E8CD2D": ("Huawei", "phone"),    "F80F41": ("Huawei", "phone"),

    # Google / Android (Pixel)
    "001A11": ("Google", "iot"),      "94EB2C": ("Google", "phone"),
    "1CB17C": ("Google", "phone"),    "40B036": ("Google", "iot"),
    "48D6D5": ("Google", "iot"),      "6C4008": ("Google", "phone"),
    "A47733": ("Google", "phone"),    "F88FCA": ("Google", "phone"),

    # OnePlus
    "00F409": ("OnePlus", "phone"),   "1C8779": ("OnePlus", "phone"),
    "2C6C8E": ("OnePlus", "phone"),   "84C9B2": ("OnePlus", "phone"),
    "B0E235": ("OnePlus", "phone"),

    # Routers: TP-Link
    "14EBCD": ("TP-Link", "router"),  "1C61B4": ("TP-Link", "router"),
    "20DC93": ("TP-Link", "router"),  "244CE3": ("TP-Link", "router"),
    "2C56DC": ("TP-Link", "router"),  "300D9E": ("TP-Link", "router"),
    "50C7BF": ("TP-Link", "router"),  "54AF97": ("TP-Link", "router"),
    "6446EB": ("TP-Link", "router"),  "6C5C89": ("TP-Link", "router"),
    "7C8BCA": ("TP-Link", "router"),  "845CF9": ("TP-Link", "router"),
    "94D9B3": ("TP-Link", "router"),  "A0F3C1": ("TP-Link", "router"),
    "C46E1F": ("TP-Link", "router"),  "D850E6": ("TP-Link", "router"),
    "E4A7A0": ("TP-Link", "router"),  "E84DD0": ("TP-Link", "router"),
    "F0A731": ("TP-Link", "router"),  "F81A67": ("TP-Link", "router"),

    # ASUS
    "000C6E": ("ASUS", "router"),     "049226": ("ASUS", "router"),
    "0890FA": ("ASUS", "laptop"),     "10BF48": ("ASUS", "laptop"),
    "1C872C": ("ASUS", "laptop"),     "2C4D54": ("ASUS", "laptop"),
    "38D547": ("ASUS", "laptop"),     "48F17F": ("ASUS", "router"),
    "50465D": ("ASUS", "router"),     "5404A6": ("ASUS", "router"),
    "74D02B": ("ASUS", "laptop"),     "8C8D28": ("ASUS", "laptop"),
    "BC EE 7B": ("ASUS", "router"),   "E03F49": ("ASUS", "router"),
    "F8B568": ("ASUS", "laptop"),

    # Netgear
    "001B2F": ("Netgear", "router"),  "002AB0": ("Netgear", "router"),
    "00146C": ("Netgear", "router"),  "20E52A": ("Netgear", "router"),
    "28C68E": ("Netgear", "router"),  "2C3033": ("Netgear", "router"),
    "44944D": ("Netgear", "router"),  "6CB0CE": ("Netgear", "router"),
    "9C3DCF": ("Netgear", "router"),  "A040A0": ("Netgear", "router"),
    "C0FF28": ("Netgear", "router"),

    # D-Link
    "00179A": ("D-Link", "router"),   "0019E0": ("D-Link", "router"),
    "001CF0": ("D-Link", "router"),   "00264D": ("D-Link", "router"),
    "1C5F2B": ("D-Link", "router"),   "28107B": ("D-Link", "router"),
    "34A84E": ("D-Link", "router"),   "5CD998": ("D-Link", "router"),
    "84C9B2": ("D-Link", "router"),   "B8A386": ("D-Link", "router"),
    "C8D3A3": ("D-Link", "router"),

    # Cisco
    "000142": ("Cisco", "router"),    "000143": ("Cisco", "router"),
    "001731": ("Cisco", "router"),    "0019E7": ("Cisco", "router"),
    "001B2B": ("Cisco", "router"),    "001C58": ("Cisco", "router"),
    "001D2B": ("Cisco", "router"),    "001DE5": ("Cisco", "router"),
    "001E13": ("Cisco", "router"),    "001EBE": ("Cisco", "router"),
    "002168": ("Cisco", "router"),    "00219B": ("Cisco", "router"),
    "0022BD": ("Cisco", "router"),    "00231B": ("Cisco", "router"),
    "0023EA": ("Cisco", "router"),    "0024F7": ("Cisco", "router"),
    "00259C": ("Cisco", "router"),    "0026CA": ("Cisco", "router"),
    "2C3167": ("Cisco", "router"),    "3C0E23": ("Cisco", "ap"),
    "6400F1": ("Cisco", "router"),    "70F396": ("Cisco", "ap"),
    "A48CDB": ("Cisco", "router"),    "B4E9B0": ("Cisco", "router"),
    "C89C1D": ("Cisco", "router"),    "E8BA70": ("Cisco", "router"),
    "F07F06": ("Cisco", "router"),

    # Dell
    "001A4B": ("Dell", "desktop"),    "001D09": ("Dell", "desktop"),
    "001E4F": ("Dell", "desktop"),    "002170": ("Dell", "desktop"),
    "00236C": ("Dell", "laptop"),     "0024E8": ("Dell", "desktop"),
    "002564": ("Dell", "laptop"),     "00265A": ("Dell", "laptop"),
    "18A994": ("Dell", "laptop"),     "1C40AF": ("Dell", "desktop"),
    "20047B": ("Dell", "desktop"),    "28F10E": ("Dell", "laptop"),
    "34E6D7": ("Dell", "laptop"),     "44A842": ("Dell", "desktop"),
    "485B39": ("Dell", "laptop"),     "50E549": ("Dell", "desktop"),
    "5CBA37": ("Dell", "desktop"),    "7CC3A1": ("Dell", "laptop"),
    "84C11A": ("Dell", "desktop"),    "A4BADB": ("Dell", "laptop"),
    "B0838A": ("Dell", "laptop"),     "B4D5BD": ("Dell", "laptop"),
    "D067E5": ("Dell", "laptop"),     "F01FEC": ("Dell", "desktop"),
    "F48E38": ("Dell", "laptop"),     "F8B156": ("Dell", "laptop"),

    # HP / Hewlett-Packard
    "001083": ("HP", "desktop"),      "001279": ("HP", "printer"),
    "00137A": ("HP", "laptop"),       "001560": ("HP", "desktop"),
    "001635": ("HP", "laptop"),       "001A4B": ("HP", "desktop"),
    "001B78": ("HP", "desktop"),      "001CC4": ("HP", "laptop"),
    "001E0B": ("HP", "desktop"),      "00218E": ("HP", "laptop"),
    "002248": ("HP", "desktop"),      "00235A": ("HP", "laptop"),
    "002566": ("HP", "desktop"),      "00269E": ("HP", "laptop"),
    "002769": ("HP", "desktop"),      "002805": ("HP", "desktop"),
    "0C8112": ("HP", "printer"),      "1C98EC": ("HP", "laptop"),
    "24BE05": ("HP", "laptop"),       "28924A": ("HP", "desktop"),
    "3CDAD5": ("HP", "laptop"),       "40B034": ("HP", "laptop"),
    "5CFB24": ("HP", "laptop"),       "68B599": ("HP", "laptop"),
    "70877B": ("HP", "laptop"),       "84342D": ("HP", "laptop"),
    "9C8E99": ("HP", "laptop"),       "A0D3C1": ("HP", "laptop"),
    "B499BA": ("HP", "laptop"),       "C4346B": ("HP", "printer"),
    "D8D385": ("HP", "printer"),      "E8039A": ("HP", "laptop"),
    "F4CE46": ("HP", "laptop"),       "F83DFF": ("HP", "laptop"),

    # Lenovo
    "001374": ("Lenovo", "laptop"),   "0024BE": ("Lenovo", "laptop"),
    "286ED4": ("Lenovo", "laptop"),   "3085A9": ("Lenovo", "laptop"),
    "40018C": ("Lenovo", "laptop"),   "5404A6": ("Lenovo", "laptop"),
    "54EE75": ("Lenovo", "phone"),    "606720": ("Lenovo", "laptop"),
    "70720D": ("Lenovo", "laptop"),   "88703C": ("Lenovo", "laptop"),
    "8C8D28": ("Lenovo", "laptop"),   "9CDB07": ("Lenovo", "laptop"),
    "A06090": ("Lenovo", "laptop"),   "B8AC6F": ("Lenovo", "laptop"),
    "C04A00": ("Lenovo", "laptop"),   "D850E6": ("Lenovo", "laptop"),
    "E8B008": ("Lenovo", "laptop"),   "F0DEF1": ("Lenovo", "laptop"),

    # Raspberry Pi Foundation
    "B827EB": ("Raspberry Pi", "server"), "DC4F22": ("Raspberry Pi", "server"),
    "E45F01": ("Raspberry Pi", "server"),

    # Amazon (Echo, Fire)
    "0C5765": ("Amazon", "iot"),      "34D270": ("Amazon", "iot"),
    "40B4CD": ("Amazon", "iot"),      "44650D": ("Amazon", "iot"),
    "6846C5": ("Amazon", "iot"),      "74C246": ("Amazon", "iot"),
    "84D6D0": ("Amazon", "iot"),      "A002DC": ("Amazon", "iot"),
    "A41374": ("Amazon", "iot"),      "F0272D": ("Amazon", "iot"),
    "FC65DE": ("Amazon", "iot"),

    # Microsoft (Surface, Xbox)
    "0050F2": ("Microsoft", "laptop"), "28187B": ("Microsoft", "gaming"),
    "485073": ("Microsoft", "laptop"), "5C514F": ("Microsoft", "gaming"),
    "6045BD": ("Microsoft", "laptop"), "7C1E52": ("Microsoft", "gaming"),
    "98528D": ("Microsoft", "laptop"), "C45AB1": ("Microsoft", "laptop"),
    "DC0EA1": ("Microsoft", "laptop"),

    # Nintendo
    "002459": ("Nintendo", "gaming"),  "00224C": ("Nintendo", "gaming"),
    "002709": ("Nintendo", "gaming"),  "003452": ("Nintendo", "gaming"),
    "0009BF": ("Nintendo", "gaming"),  "4C2AAA": ("Nintendo", "gaming"),
    "7CF68E": ("Nintendo", "gaming"),  "A438CC": ("Nintendo", "gaming"),
    "E00C7F": ("Nintendo", "gaming"),  "E84ECE": ("Nintendo", "gaming"),

    # Sony (PlayStation, TV)
    "001A8C": ("Sony", "gaming"),      "001D0D": ("Sony", "gaming"),
    "001EBE": ("Sony", "gaming"),      "0022A9": ("Sony", "gaming"),
    "002655": ("Sony", "tv"),          "0028E8": ("Sony", "tv"),
    "002AD4": ("Sony", "gaming"),      "0032B6": ("Sony", "tv"),
    "00D9D1": ("Sony", "gaming"),      "10568A": ("Sony", "gaming"),
    "28FDA1": ("Sony", "gaming"),      "2C5EF5": ("Sony", "tv"),
    "30E171": ("Sony", "tv"),          "40B89B": ("Sony", "gaming"),
    "70AF6A": ("Sony", "gaming"),      "A8E063": ("Sony", "gaming"),
    "BC60A7": ("Sony", "gaming"),      "F8D0AC": ("Sony", "gaming"),

    # LG (TV, phones)
    "001E75": ("LG", "tv"),            "003BE5": ("LG", "tv"),
    "04DFA7": ("LG", "tv"),            "28CF27": ("LG", "tv"),
    "30766F": ("LG", "phone"),         "3C6200": ("LG", "tv"),
    "48597F": ("LG", "tv"),            "58D561": ("LG", "tv"),
    "64BC0C": ("LG", "tv"),            "8C3AE3": ("LG", "tv"),
    "C80A6C": ("LG", "phone"),         "CC2D8C": ("LG", "phone"),
    "E02CEC": ("LG", "tv"),            "E4F9C2": ("LG", "tv"),

    # VMware / VirtualBox
    "000C29": ("VMware", "vm"),        "000569": ("VMware", "vm"),
    "005056": ("VMware", "vm"),        "001C14": ("VMware", "vm"),
    "080027": ("VirtualBox", "vm"),

    # Printers
    "0000AA": ("Xerox", "printer"),    "0004AC": ("IBM", "printer"),
    "00045A": ("Lexmark", "printer"),  "001B78": ("Canon", "printer"),
    "00CCB4": ("Epson", "printer"),    "0800B3": ("Olivetti", "printer"),
    "28E950": ("Lexmark", "printer"),  "3417EB": ("Canon", "printer"),
    "5C33CB": ("Epson", "printer"),    "84FDE1": ("HP", "printer"),
    "A413C6": ("Canon", "printer"),    "AC18F4": ("Brother", "printer"),
    "D410BA": ("Brother", "printer"),  "F4921A": ("Canon", "printer"),

    # Smart Home / IoT
    "189C27": ("Philips Hue", "iot"),  "ECB5FA": ("Philips Hue", "iot"),
    "F0726F": ("Philips Hue", "iot"),  "00178B": ("Nest", "iot"),
    "18B905": ("Nest", "iot"),         "64169D": ("Nest", "iot"),
    "0017C9": ("Belkin", "iot"),       "14596E": ("Belkin", "iot"),
    "244CE3": ("Belkin", "iot"),       "EC1A59": ("Belkin", "iot"),
}

# ── Tipo → (Emoji, Etiqueta ES) ────────────────────────────────────────────────
DEVICE_TYPES: dict[str, tuple[str, str]] = {
    "phone":   ("📱", "Teléfono"),
    "laptop":  ("💻", "Laptop"),
    "desktop": ("🖥️",  "PC de escritorio"),
    "router":  ("📡", "Router"),
    "ap":      ("📶", "Access Point"),
    "iot":     ("🏠", "Dispositivo IoT"),
    "tv":      ("📺", "Smart TV"),
    "gaming":  ("🎮", "Consola"),
    "printer": ("🖨️",  "Impresora"),
    "server":  ("🖧",  "Servidor / SBC"),
    "vm":      ("☁️",  "Máquina Virtual"),
    "unknown": ("❓", "Desconocido"),
}


def lookup(mac: str) -> tuple[str, str, str, str]:
    """Devuelve (vendor, device_type, emoji, type_label)."""
    prefix = mac.upper().replace(":", "").replace("-", "")[:6]
    vendor, dtype = OUI_DB.get(prefix, ("", "unknown"))
    emoji, label = DEVICE_TYPES.get(dtype, ("❓", "Desconocido"))
    return vendor, dtype, emoji, label


def infer_from_hostname(hostname: str, vendor: str, dtype: str) -> tuple[str, str, str]:
    """Ajusta el tipo de dispositivo usando el nombre de host."""
    h = hostname.lower()
    overrides = [
        (["iphone"],              "📱", "iPhone"),
        (["ipad"],                "📱", "iPad"),
        (["macbook", "mac-mini", "imac", "mac-pro"], "💻", "Mac"),
        (["android"],             "📱", "Android"),
        (["samsung"],             "📱", "Samsung"),
        (["pixel"],               "📱", "Pixel"),
        (["echo", "alexa"],       "🏠", "Amazon Echo"),
        (["fire"],                "🏠", "Fire Device"),
        (["appletv", "apple-tv"], "📺", "Apple TV"),
        (["chromecast"],          "📺", "Chromecast"),
        (["roku"],                "📺", "Roku"),
        (["xbox"],                "🎮", "Xbox"),
        (["playstation", "ps4", "ps5"], "🎮", "PlayStation"),
        (["switch"],              "🎮", "Nintendo Switch"),
        (["printer", "print"],    "🖨️",  "Impresora"),
        (["router", "gateway", "gw"], "📡", "Router"),
        (["raspberrypi", "raspi", "rpi"], "🖧", "Raspberry Pi"),
        (["vm", "virtual"],       "☁️",  "VM"),
        (["server", "srv", "nas"], "🖧",  "Servidor"),
        (["desktop", "pc-"],      "🖥️",  "PC"),
        (["laptop", "notebook"],  "💻", "Laptop"),
    ]
    for keywords, emoji, label in overrides:
        if any(k in h for k in keywords):
            return emoji, label, label

    # Si el vendor es Apple y no hay override, distinguir por tipo base
    if vendor == "Apple":
        if dtype == "phone":
            return "📱", "iPhone / iPad", "iPhone / iPad"
        return "💻", "Mac", "Mac"

    emoji, label = DEVICE_TYPES.get(dtype, ("❓", "Desconocido"))
    display = f"{vendor} {label}" if vendor else label
    return emoji, label, display
