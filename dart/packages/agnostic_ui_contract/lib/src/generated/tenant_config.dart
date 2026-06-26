// GERADO por dart/tool/generate_models.dart — não editar à mão.
// Fonte: packages/core/schema (JSON Schema do @yukilabs/agnostic-ui-core).
// ignore_for_file: type=lint

enum TenantConfigDataSource {
  mock, core,
}

class TenantConfigTheme {
  const TenantConfigTheme({
    required this.primaryColor,
    this.secondaryColor,
    this.accentColor,
    this.backgroundColor,
    this.logoUrl,
  });

  factory TenantConfigTheme.fromJson(Map<String, Object?> json) => TenantConfigTheme(
    primaryColor: json['primaryColor']! as String,
    secondaryColor: json['secondaryColor'] == null ? null : json['secondaryColor']! as String,
    accentColor: json['accentColor'] == null ? null : json['accentColor']! as String,
    backgroundColor: json['backgroundColor'] == null ? null : json['backgroundColor']! as String,
    logoUrl: json['logoUrl'] == null ? null : json['logoUrl']! as String,
  );

  final String primaryColor;
  final String? secondaryColor;
  final String? accentColor;
  final String? backgroundColor;
  final String? logoUrl;

  Map<String, Object?> toJson() => <String, Object?>{
    'primaryColor': primaryColor,
    if (secondaryColor != null) 'secondaryColor': secondaryColor!,
    if (accentColor != null) 'accentColor': accentColor!,
    if (backgroundColor != null) 'backgroundColor': backgroundColor!,
    if (logoUrl != null) 'logoUrl': logoUrl!,
  };
}

class TenantConfigLayoutHeader {
  const TenantConfigLayoutHeader({
    this.showLogo,
    this.showTitle,
    this.title,
  });

  factory TenantConfigLayoutHeader.fromJson(Map<String, Object?> json) => TenantConfigLayoutHeader(
    showLogo: json['showLogo'] == null ? null : json['showLogo']! as bool,
    showTitle: json['showTitle'] == null ? null : json['showTitle']! as bool,
    title: json['title'] == null ? null : json['title']! as String,
  );

  final bool? showLogo;
  final bool? showTitle;
  final String? title;

  Map<String, Object?> toJson() => <String, Object?>{
    if (showLogo != null) 'showLogo': showLogo!,
    if (showTitle != null) 'showTitle': showTitle!,
    if (title != null) 'title': title!,
  };
}

class TenantConfigLayoutAppBarDefault {
  const TenantConfigLayoutAppBarDefault({
    this.sticky,
    this.frosted,
  });

  factory TenantConfigLayoutAppBarDefault.fromJson(Map<String, Object?> json) => TenantConfigLayoutAppBarDefault(
    sticky: json['sticky'] == null ? null : json['sticky']! as bool,
    frosted: json['frosted'] == null ? null : json['frosted']! as bool,
  );

  final bool? sticky;
  final bool? frosted;

  Map<String, Object?> toJson() => <String, Object?>{
    if (sticky != null) 'sticky': sticky!,
    if (frosted != null) 'frosted': frosted!,
  };
}

class TenantConfigLayoutAppBarRoutesValue {
  const TenantConfigLayoutAppBarRoutesValue({
    this.backBehavior,
  });

  factory TenantConfigLayoutAppBarRoutesValue.fromJson(Map<String, Object?> json) => TenantConfigLayoutAppBarRoutesValue(
    backBehavior: json['backBehavior'] == null ? null : json['backBehavior']! as String,
  );

  final String? backBehavior;

  Map<String, Object?> toJson() => <String, Object?>{
    if (backBehavior != null) 'backBehavior': backBehavior!,
  };
}

class TenantConfigLayoutAppBar {
  const TenantConfigLayoutAppBar({
    this.default_,
    this.routes,
  });

  factory TenantConfigLayoutAppBar.fromJson(Map<String, Object?> json) => TenantConfigLayoutAppBar(
    default_: json['default'] == null ? null : TenantConfigLayoutAppBarDefault.fromJson(json['default']! as Map<String, Object?>),
    routes: json['routes'] == null ? null : (json['routes']! as Map<String, Object?>).map((String k, Object? e) => MapEntry<String, TenantConfigLayoutAppBarRoutesValue>(k, TenantConfigLayoutAppBarRoutesValue.fromJson(e as Map<String, Object?>))),
  );

  final TenantConfigLayoutAppBarDefault? default_;
  final Map<String, TenantConfigLayoutAppBarRoutesValue>? routes;

  Map<String, Object?> toJson() => <String, Object?>{
    if (default_ != null) 'default': default_!.toJson(),
    if (routes != null) 'routes': routes!.map((String k, TenantConfigLayoutAppBarRoutesValue e) => MapEntry<String, Object?>(k, e.toJson())),
  };
}

class TenantConfigLayoutNavigation {
  const TenantConfigLayoutNavigation({
    this.showAppbar,
  });

  factory TenantConfigLayoutNavigation.fromJson(Map<String, Object?> json) => TenantConfigLayoutNavigation(
    showAppbar: json['showAppbar'] == null ? null : json['showAppbar']! as bool,
  );

  final bool? showAppbar;

  Map<String, Object?> toJson() => <String, Object?>{
    if (showAppbar != null) 'showAppbar': showAppbar!,
  };
}

class TenantConfigLayout {
  const TenantConfigLayout({
    this.header,
    this.appBar,
    this.navigation,
  });

  factory TenantConfigLayout.fromJson(Map<String, Object?> json) => TenantConfigLayout(
    header: json['header'] == null ? null : TenantConfigLayoutHeader.fromJson(json['header']! as Map<String, Object?>),
    appBar: json['appBar'] == null ? null : TenantConfigLayoutAppBar.fromJson(json['appBar']! as Map<String, Object?>),
    navigation: json['navigation'] == null ? null : TenantConfigLayoutNavigation.fromJson(json['navigation']! as Map<String, Object?>),
  );

  final TenantConfigLayoutHeader? header;
  final TenantConfigLayoutAppBar? appBar;
  final TenantConfigLayoutNavigation? navigation;

  Map<String, Object?> toJson() => <String, Object?>{
    if (header != null) 'header': header!.toJson(),
    if (appBar != null) 'appBar': appBar!.toJson(),
    if (navigation != null) 'navigation': navigation!.toJson(),
  };
}

class TenantConfigSecurity {
  const TenantConfigSecurity({
    this.corsOrigins,
    this.ipAllowlist,
    this.requireAuth,
  });

  factory TenantConfigSecurity.fromJson(Map<String, Object?> json) => TenantConfigSecurity(
    corsOrigins: json['corsOrigins'] == null ? null : (json['corsOrigins']! as List<Object?>).map((Object? e) => e as String).toList(),
    ipAllowlist: json['ipAllowlist'] == null ? null : (json['ipAllowlist']! as List<Object?>).map((Object? e) => e as String).toList(),
    requireAuth: json['requireAuth'] == null ? null : json['requireAuth']! as bool,
  );

  final List<String>? corsOrigins;
  final List<String>? ipAllowlist;
  final bool? requireAuth;

  Map<String, Object?> toJson() => <String, Object?>{
    if (corsOrigins != null) 'corsOrigins': corsOrigins!.map((String e) => e).toList(),
    if (ipAllowlist != null) 'ipAllowlist': ipAllowlist!.map((String e) => e).toList(),
    if (requireAuth != null) 'requireAuth': requireAuth!,
  };
}

class TenantConfig {
  const TenantConfig({
    required this.id,
    required this.name,
    required this.slug,
    required this.dataSource,
    this.theme,
    this.layout,
    this.security,
    this.features,
    required this.version,
  });

  factory TenantConfig.fromJson(Map<String, Object?> json) => TenantConfig(
    id: json['id']! as String,
    name: json['name']! as String,
    slug: json['slug']! as String,
    dataSource: TenantConfigDataSource.values.byName(json['dataSource']! as String),
    theme: json['theme'] == null ? null : TenantConfigTheme.fromJson(json['theme']! as Map<String, Object?>),
    layout: json['layout'] == null ? null : TenantConfigLayout.fromJson(json['layout']! as Map<String, Object?>),
    security: json['security'] == null ? null : TenantConfigSecurity.fromJson(json['security']! as Map<String, Object?>),
    features: json['features'] == null ? null : (json['features']! as Map<String, Object?>).map((String k, Object? e) => MapEntry<String, bool>(k, e as bool)),
    version: json['version']! as String,
  );

  final String id;
  final String name;
  final String slug;
  final TenantConfigDataSource dataSource;
  final TenantConfigTheme? theme;
  final TenantConfigLayout? layout;
  final TenantConfigSecurity? security;
  final Map<String, bool>? features;
  final String version;

  Map<String, Object?> toJson() => <String, Object?>{
    'id': id,
    'name': name,
    'slug': slug,
    'dataSource': dataSource.name,
    if (theme != null) 'theme': theme!.toJson(),
    if (layout != null) 'layout': layout!.toJson(),
    if (security != null) 'security': security!.toJson(),
    if (features != null) 'features': features!.map((String k, bool e) => MapEntry<String, Object?>(k, e)),
    'version': version,
  };
}

