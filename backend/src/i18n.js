import { getGuildConfig } from './store.js';

export const SUPPORTED_LOCALES = Object.freeze([
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' }
]);

const supported = new Set(SUPPORTED_LOCALES.map(locale => locale.value));

const messages = {
  'en-GB': {
    'premium.required.pro': 'This feature requires ModerationDesk Pro. Use `/premium features` for details.',
    'premium.required.enterprise': 'This feature requires ModerationDesk Pro+. Use `/premium features` for details.',
    'premium.store.ready': 'Choose a guild subscription for this server in the ModerationDesk Store: {url}',
    'premium.store.pending': 'Plan management is available at {url}. Discord subscriptions have not been configured by the bot operator yet.'
  },
  'es-ES': {
    'premium.required.pro': 'Esta función requiere ModerationDesk Pro. Usa `/premium features` para ver los detalles.',
    'premium.required.enterprise': 'Esta función requiere ModerationDesk Pro+. Usa `/premium features` para ver los detalles.',
    'premium.store.ready': 'Elige una suscripción para este servidor en la tienda de ModerationDesk: {url}',
    'premium.store.pending': 'La gestión del plan está disponible en {url}. El operador aún no ha configurado las suscripciones de Discord.'
  },
  fr: {
    'premium.required.pro': 'Cette fonctionnalité nécessite ModerationDesk Pro. Utilisez `/premium features` pour les détails.',
    'premium.required.enterprise': 'Cette fonctionnalité nécessite ModerationDesk Pro+. Utilisez `/premium features` pour les détails.',
    'premium.store.ready': 'Choisissez un abonnement de serveur dans la boutique ModerationDesk : {url}',
    'premium.store.pending': 'La gestion du forfait est disponible sur {url}. Les abonnements Discord ne sont pas encore configurés.'
  },
  de: {
    'premium.required.pro': 'Diese Funktion erfordert ModerationDesk Pro. Details finden Sie mit `/premium features`.',
    'premium.required.enterprise': 'Diese Funktion erfordert ModerationDesk Pro+. Details finden Sie mit `/premium features`.',
    'premium.store.ready': 'Wähle eine Server-Mitgliedschaft im ModerationDesk Store: {url}',
    'premium.store.pending': 'Die Tarifverwaltung ist unter {url} verfügbar. Discord-Abonnements sind noch nicht eingerichtet.'
  }
};

export function normaliseLocale(value) {
  const locale = String(value || '');
  if (supported.has(locale)) return locale;
  if (locale.startsWith('en')) return 'en-GB';
  if (locale.startsWith('es')) return 'es-ES';
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('de')) return 'de';
  return 'en-GB';
}

export function guildLocale(guildId, interactionLocale = '') {
  return normaliseLocale(interactionLocale || getGuildConfig(guildId).locale);
}

export function t(locale, key, variables = {}) {
  const phrase = messages[normaliseLocale(locale)]?.[key] || messages['en-GB'][key] || key;
  return phrase.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`));
}
