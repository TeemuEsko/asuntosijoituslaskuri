export type PrivacyConfiguration = {
  controllerName?: string;
  contact?: string;
  retentionPeriod?: string;
  internationalTransfers?: string;
  legalBases?: string;
  serviceProviders?: string;
};

export function privacyConfiguration(environment = process.env): PrivacyConfiguration {
  return {
    controllerName: environment.PRIVACY_CONTROLLER_NAME?.trim() || undefined,
    contact: environment.PRIVACY_CONTACT?.trim() || undefined,
    retentionPeriod: environment.PRIVACY_RETENTION_PERIOD?.trim() || undefined,
    internationalTransfers: environment.PRIVACY_INTERNATIONAL_TRANSFERS?.trim() || undefined,
    legalBases: environment.PRIVACY_LEGAL_BASES?.trim() || undefined,
    serviceProviders: environment.PRIVACY_SERVICE_PROVIDERS?.trim() || undefined,
  };
}

export function missingPrivacyConfiguration(configuration: PrivacyConfiguration): string[] {
  return [
    ["rekisterinpitäjä", configuration.controllerName],
    ["yhteydenottotapa", configuration.contact],
    ["säilytysaika", configuration.retentionPeriod],
    ["kansainväliset siirrot", configuration.internationalTransfers],
    ["käsittelyn oikeusperusteet", configuration.legalBases],
    ["palveluntarjoajat ja käsittelijät", configuration.serviceProviders],
  ].filter((entry) => !entry[1]).map((entry) => entry[0] as string);
}
