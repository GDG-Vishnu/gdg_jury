import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Team {
  teamId: number;
  teamName: string;
  isEvaluated: boolean;
  isUpdated: boolean;
}

interface EvaluationData {
  juryName: string;
  sheetLink: string;
  teamId: number;
  teamName: string;
  innovation: number;
  creativity: number;
  technicalImplementation: number;
  useOfGoogleTechnology: number;
}

// Fallback: Read from local data.json
const DATA_FILE_PATH = path.join(process.cwd(), "data.json");

// Map jury names to their JSON files
const JURY_FILE_MAP: { [key: string]: string } = {
  "John Doe 1": path.join(process.cwd(), "data", "jury1.json"),
  "John Doe 2": path.join(process.cwd(), "data", "jury2.json"),
  "John Doe 3": path.join(process.cwd(), "data", "jury3.json"),
};

// Get the correct file path for a jury
function getJuryFilePath(juryName: string): string {
  return JURY_FILE_MAP[juryName] || DATA_FILE_PATH;
}

function readLocalTeamsData(juryName?: string): Team[] {
  try {
    const filePath = juryName ? getJuryFilePath(juryName) : DATA_FILE_PATH;
    const data = fs.readFileSync(filePath, "utf-8");
    console.log(`Reading teams from: ${filePath}`);
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading data file:", error);
    return [];
  }
}

function writeLocalTeamsData(teams: Team[], juryName?: string): boolean {
  try {
    const filePath = juryName ? getJuryFilePath(juryName) : DATA_FILE_PATH;
    fs.writeFileSync(filePath, JSON.stringify(teams, null, 2));
    console.log(`Writing teams to: ${filePath}`);
    return true;
  } catch (error) {
    console.error("Error writing to data file:", error);
    return false;
  }
}

// Function to get teams - uses jury-specific JSON file
async function fetchTeamsForJury(juryName: string): Promise<Team[]> {
  const localTeams = readLocalTeamsData(juryName);

  if (localTeams.length > 0) {
    console.log(`Loaded ${localTeams.length} teams for jury: ${juryName}`);
    return localTeams;
  }

  console.error(`No teams found for jury: ${juryName}`);
  return [];
}

// Google Sheet ID for updating isEvaluated and isUpdated status
const TEAM_SHEET_ID = "1D6bdlN952JzBzqyzkqzw1dteEu0MosuH8Szj_7gVj00";

// Function to update isEvaluated/isUpdated in the Google Sheet using a dedicated Apps Script
async function updateGoogleSheetStatus(
  teamId: number,
  isEvaluated: boolean,
  isUpdated: boolean
): Promise<void> {
  try {
    // Create a dedicated Apps Script Web App URL for updating the team status sheet
    // This URL should point to an Apps Script that can write to the team sheet
    const UPDATE_TEAM_STATUS_URL = `https://script.google.com/macros/s/AKfycbyKYn7M5V-vIXGnuAyw8RzqkzPluinza2dzFTa4KEMoxetc3uHJA5wpKDYA9SJO98ED4Q/exec`;

    const payload = {
      action: "updateTeamStatus",
      targetSheetId: TEAM_SHEET_ID,
      teamId: teamId,
      isEvaluated: isEvaluated,
      isUpdated: isUpdated,
    };

    console.log(
      "Sending Google Sheet update request:",
      JSON.stringify(payload)
    );

    const response = await fetch(UPDATE_TEAM_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain", // Use text/plain to avoid CORS preflight
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("Google Sheet update response:", responseText);

    if (response.ok) {
      console.log(`Google Sheet status updated for team ${teamId}`);
    } else {
      console.error(
        `Failed to update Google Sheet status: ${response.status} - ${responseText}`
      );
    }
  } catch (error) {
    console.error("Error updating Google Sheet status:", error);
    // Don't throw - we don't want to fail the whole request if sheet update fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EvaluationData = await request.json();

    // Validate required fields
    if (!body.juryName || !body.sheetLink || !body.teamName || !body.teamId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: juryName, sheetLink, teamId, teamName",
        },
        { status: 400 }
      );
    }

    // Validate score ranges
    if (
      body.innovation < 0 ||
      body.innovation > 15 ||
      body.creativity < 0 ||
      body.creativity > 15 ||
      body.technicalImplementation < 0 ||
      body.technicalImplementation > 20 ||
      body.useOfGoogleTechnology < 0 ||
      body.useOfGoogleTechnology > 10
    ) {
      return NextResponse.json(
        { error: "Scores are out of valid range" },
        { status: 400 }
      );
    }

    // Fetch current teams data for this jury
    const teams = await fetchTeamsForJury(body.juryName);
    const teamIndex = teams.findIndex((t) => t.teamId === body.teamId);

    if (teamIndex === -1) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const team = teams[teamIndex];
    const wasAlreadyEvaluated = team.isEvaluated;

    // Google Apps Script URL - this will update the Google Sheet
    const APPS_SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbyZIgkCmIl4Ba8Ru1VFLwjtfuq6ED-Go4IStAuXFSX-JWhjhv6r7kBlUy2VTPyojrfCew/exec";

    // Forward the request to Google Apps Script (which updates the sheet)
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        isEvaluated: true,
        isUpdated: wasAlreadyEvaluated,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Apps Script responded with status: ${response.status}`
      );
    }

    const result = await response.json();

    // Update jury-specific JSON file and Google Sheet in parallel
    const localTeams = readLocalTeamsData(body.juryName);
    const localTeamIndex = localTeams.findIndex(
      (t) => t.teamId === body.teamId
    );

    const newIsEvaluated = true;
    const newIsUpdated = wasAlreadyEvaluated;

    // Run local update and Google Sheet update in parallel
    const updatePromises: Promise<void>[] = [];

    // Local jury-specific JSON file update
    if (localTeamIndex !== -1) {
      localTeams[localTeamIndex].isEvaluated = newIsEvaluated;
      if (wasAlreadyEvaluated) {
        localTeams[localTeamIndex].isUpdated = newIsUpdated;
      }
      writeLocalTeamsData(localTeams, body.juryName);
    }

    // Google Sheet update (runs in parallel, doesn't block response)
    updatePromises.push(
      updateGoogleSheetStatus(body.teamId, newIsEvaluated, newIsUpdated)
    );

    // Wait for Google Sheet update (but don't fail if it errors)
    await Promise.allSettled(updatePromises);

    return NextResponse.json({
      success: true,
      message: wasAlreadyEvaluated
        ? "Re-evaluation submitted successfully"
        : "Evaluation submitted successfully",
      isUpdated: wasAlreadyEvaluated,
      data: result,
      totalScore:
        body.innovation +
        body.creativity +
        body.technicalImplementation +
        body.useOfGoogleTechnology,
    });
  } catch (error) {
    console.error("Error submitting evaluation:", error);

    return NextResponse.json(
      {
        error: "Failed to submit evaluation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juryName = searchParams.get("juryName") || "John Doe 1";

  const teams = await fetchTeamsForJury(juryName);
  return NextResponse.json({
    message: "Evaluation API endpoint is running",
    method: "Use POST to submit evaluations",
    juryName: juryName,
    teams: teams,
  });
}
