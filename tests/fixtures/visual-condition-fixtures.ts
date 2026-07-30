import type { VisualConditionImageAssessment, VisualConditionObservation, VisualConditionRoom } from "../../src/core/visual-condition/types.ts";

export function visualImage(id: string, room: VisualConditionRoom, options: Partial<VisualConditionImageAssessment> = {}): VisualConditionImageAssessment {
  return { imageId: id, fileName: `${id}.jpg`, room, visibleSurfaces: ["seinät", "lattia"], imageQuality: "high", assessability: "good", qualityReason: "Kuva on tarkka ja valoisa.", observationIds: [], ...options };
}

export function visualObservation(id: string, room: VisualConditionRoom, options: Partial<VisualConditionObservation> = {}): VisualConditionObservation {
  return { id, imageId: `image-${id}`, room, area: "general", type: "wear", severity: "low", summary: "Näkyvää pintakulumaa", details: "Pinnassa näkyy vähäistä käytön jälkeä.", confidence: "high", requiresProfessionalInspection: false, source: "image_ai", status: "proposed", userConfirmed: false, userEdited: false, createdAt: "2026-07-30T10:00:00.000Z", originalAiObservation: "Pinnassa näkyy vähäistä käytön jälkeä.", sourceHistory: [{ source: "image_ai", value: "Pinnassa näkyy vähäistä käytön jälkeä.", recordedAt: "2026-07-30T10:00:00.000Z" }], ...options };
}

export const visualConditionScenarios = {
  noImages: { images: [], observations: [] },
  clearLivingRoom: { images: [visualImage("living", "living_room")], observations: [visualObservation("living-positive", "living_room", { type: "positive_condition", severity: "info", summary: "Pinnat näyttävät siisteiltä" })] },
  multipleRooms: { images: [visualImage("living", "living_room"), visualImage("bed", "bedroom"), visualImage("kitchen", "kitchen")], observations: [visualObservation("floor", "living_room"), visualObservation("cabinet", "kitchen", { area: "cabinetry", severity: "medium" })] },
  outdatedKitchen: { images: [visualImage("old-kitchen", "kitchen")], observations: [visualObservation("old-kitchen", "kitchen", { area: "cabinetry", type: "outdatedness", severity: "low", summary: "Keittiön ilme on vanha mutta käyttökelpoinen" })] },
  bathroomRisk: { images: [visualImage("bathroom", "bathroom")], observations: [visualObservation("bathroom-risk", "bathroom", { area: "wet_area", type: "possible_moisture_indicator", severity: "high", requiresProfessionalInspection: true, details: "Kuvassa näkyy värimuutos." })] },
  lowLight: { images: [visualImage("dark", "living_room", { imageQuality: "low", assessability: "limited", qualityReason: "Kuva on tumma." })], observations: [] },
  duplicateRoom: { images: [visualImage("living-a", "living_room"), visualImage("living-b", "living_room"), visualImage("living-c", "living_room")], observations: [visualObservation("duplicate", "living_room")] },
  facadeOnly: { images: [visualImage("facade", "facade")], observations: [visualObservation("facade", "facade", { area: "facade", type: "crack", severity: "medium" })] }
} as const;

export const visualConditionAcceptanceFixtures = {
  renovatedApartment: {
    images: [visualImage("renovated-living", "living_room"), visualImage("renovated-kitchen", "kitchen"), visualImage("renovated-bathroom", "bathroom")],
    observations: [visualObservation("renovated-living", "living_room", { type: "positive_condition", severity: "info", summary: "Olohuoneen pinnat näyttävät siisteiltä" }), visualObservation("renovated-kitchen", "kitchen", { type: "positive_condition", severity: "info", summary: "Keittiön kalusteet näyttävät ehjiltä" }), visualObservation("renovated-bathroom", "bathroom", { type: "positive_condition", severity: "info", summary: "Kylpyhuoneen näkyvät pinnat näyttävät siisteiltä", details: "Näkyvää pintavauriota ei havaittu. Vedeneristyksen teknistä toteutusta ei voida arvioida kuvasta." })]
  },
  oldButCleanApartment: {
    images: [visualImage("old-living", "living_room"), visualImage("old-kitchen", "kitchen"), visualImage("old-bedroom", "bedroom")],
    observations: [visualObservation("old-living", "living_room", { type: "outdatedness", severity: "low" }), visualObservation("old-kitchen", "kitchen", { area: "cabinetry", type: "outdatedness", severity: "low" }), visualObservation("old-bedroom", "bedroom", { area: "floor", type: "wear", severity: "low" }), visualObservation("old-wall", "living_room", { area: "wall", type: "wear", severity: "low" })]
  },
  extensiveRenovation: {
    images: [visualImage("extensive-living", "living_room"), visualImage("extensive-kitchen", "kitchen"), visualImage("extensive-bed", "bedroom"), visualImage("extensive-entry", "entry")],
    observations: [visualObservation("extensive-floor", "living_room", { area: "floor", severity: "high" }), visualObservation("extensive-kitchen", "kitchen", { area: "cabinetry", type: "surface_damage", severity: "high" }), visualObservation("extensive-bed", "bedroom", { area: "wall", type: "missing_finish", severity: "high" })]
  },
  unclearBathroom: {
    images: [visualImage("unclear-bathroom", "bathroom", { imageQuality: "low", assessability: "limited", qualityReason: "Kuva on tumma ja rajattu." })],
    observations: [visualObservation("unclear-bathroom", "bathroom", { area: "wet_area", type: "unassessable", severity: "info", confidence: "low", requiresProfessionalInspection: true, summary: "Märkätilän tekninen kunto ei ole arvioitavissa" })]
  },
  possibleMoistureMark: visualConditionScenarios.bathroomRisk,
  exteriorOnly: visualConditionScenarios.facadeOnly,
  lowQualityImages: visualConditionScenarios.lowLight,
  noImages: visualConditionScenarios.noImages
} as const;
