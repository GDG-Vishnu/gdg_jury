"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import EvaluationCard from "@/components/evaluationcard";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

interface Team {
  teamId: number;
  teamName: string;
  isEvaluated: boolean;
  isUpdated: boolean;
}

export default function Evaluation() {
  const { isAuthenticated, juryName: authJuryName } = useAuth();
  const [juryName, setJuryName] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scores, setScores] = useState<{ [key: string]: number }>({
    innovation: 0,
    creativity: 0,
    technicalImplementation: 0,
    useOfGoogleTechnology: 0,
  });
  const handleScoreChange = (criterion: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  };

  // Load teams for the current jury
  const fetchTeams = async (currentJuryName: string) => {
    try {
      const response = await fetch(
        `/api/evaluation?juryName=${encodeURIComponent(currentJuryName)}`
      );
      const data = await response.json();
      if (data.teams) {
        setTeams(data.teams);
        setFilteredTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    }
  };

  // Handle search by team ID
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim() === "") {
      setFilteredTeams(teams);
      return;
    }

    const teamId = parseInt(query);
    if (!isNaN(teamId)) {
      // Search by team ID
      const foundTeam = teams.find((team) => team.teamId === teamId);
      if (foundTeam) {
        setFilteredTeams([foundTeam]);
        setSelectedTeam(foundTeam);
        toast.success(`Team ${foundTeam.teamName} selected!`);
      } else {
        setFilteredTeams([]);
        toast.error(`No team found with ID: ${teamId}`);
      }
    } else {
      // Search by team name
      const filtered = teams.filter((team) =>
        team.teamName.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedTeam) {
      toast.error("Please select a team first!");
      return;
    }

    const totalScore = Object.values(scores).reduce(
      (sum, score) => sum + score,
      0
    );
    const maxPossibleScore = 60; // 15 + 15 + 20 + 10 = 60

    if (totalScore === 0) {
      toast.error("Please enter scores for at least one criterion!");
      return;
    }

    if (
      scores.innovation > 15 ||
      scores.creativity > 15 ||
      scores.technicalImplementation > 20 ||
      scores.useOfGoogleTechnology > 10
    ) {
      toast.error("Please check the maximum scores for each criterion!");
      return;
    }

    if (Object.values(scores).some((score) => score < 0)) {
      toast.error("Scores cannot be negative!");
      return;
    }

    // Function to get sheet link based on jury name
    const getSheetLink = (name: string) => {
      switch (name) {
        case "John Doe 1":
          return "https://docs.google.com/spreadsheets/d/1B15bqn-aKbpL_XOrrHP13paLhTyL7v1IkKIdf6_aWEs/edit?usp=sharing";
        case "John Doe 2":
          return "https://docs.google.com/spreadsheets/d/1zvVWTPXi17hF79Ufp-VaNZVc-DNr0WUBzaaSRrq0lnU/edit?usp=sharing  ";
        case "John Doe 3":
          return "https://docs.google.com/spreadsheets/d/1Dbb5ujiWrNZ93YAl4rvx5AZ7nmclsIgHyFzGvk9ah28/edit?usp=sharing";
        default:
          return "https://docs.google.com/spreadsheets/d/19HAJOBfvGeyqy-EF8-0JDqMsiLV7kfBAnsfux2Dwf8E/edit?usp=sharing";
      }
    };

    try {
      // Prepare data for API
      const submissionData = {
        juryName: juryName || "Anonymous Jury",
        sheetLink: getSheetLink(juryName),
        teamId: selectedTeam.teamId,
        teamName: selectedTeam.teamName,
        innovation: scores.innovation,
        creativity: scores.creativity,
        technicalImplementation: scores.technicalImplementation,
        useOfGoogleTechnology: scores.useOfGoogleTechnology,
      };

      toast.loading("Submitting evaluation...");

      // Call local API endpoint
      const response = await fetch("/api/evaluation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      toast.dismiss(); // Remove loading toast

      const result = await response.json();

      if (response.ok && result.success) {
        const statusMessage = result.isUpdated
          ? `Re-evaluation submitted for ${selectedTeam.teamName}!`
          : `Evaluation submitted successfully for ${selectedTeam.teamName}!`;

        toast.success(
          `${statusMessage} Total Score: ${result.totalScore}/${maxPossibleScore}`,
          { duration: 4000 }
        );

        // Refresh teams data to update status for current jury
        await fetchTeams(juryName);

        // Reset scores after successful submission
        setScores({
          innovation: 0,
          creativity: 0,
          technicalImplementation: 0,
          useOfGoogleTechnology: 0,
        });
        setSelectedTeam(null);
      } else {
        throw new Error(
          result.error || `Submission failed with status: ${response.status}`
        );
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error submitting evaluation:", error);
      toast.error(
        error instanceof Error
          ? `Failed to submit: ${error.message}`
          : "Failed to submit evaluation. Please try again."
      );
    }
  };

  useEffect(() => {
    if (authJuryName) {
      setJuryName(authJuryName);
      fetchTeams(authJuryName);
    }
  }, [authJuryName]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col lg:flex-row px-2 sm:px-4 lg:px-6 xl:px-8 py-4 gap-4">
      <div className="w-full lg:w-auto lg:min-w-[320px] xl:min-w-[400px]">
        <div className="w-full space-y-6 sm:space-y-8 bg-white p-4 sm:p-6 rounded-2xl border-2 border-[#33A854] shadow-lg">
          <div>
            <div className="mx-auto flex items-center justify-center rounded-full p-2">
              <img
                src="https://res.cloudinary.com/dlupkibvq/image/upload/v1767165494/fxurmxnnjqivpw1aan7d.svg "
                alt="GDG Logo"
                className="h-12 w-auto sm:h-16 lg:h-20"
              />
            </div>
            <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">
              Jury Evaluation Dashboard
            </h2>
            <p className="mt-2 text-center text-xs sm:text-sm text-gray-600">
              Welcome, {juryName || "Jury Member"}
            </p>
          </div>
          {/* Dashboard content - keep empty as requested */}
        </div>
        <div className="h-auto bg-white p-3 sm:p-4 mt-4 rounded-2xl border-2 border-[#E6452D] shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center p-2 gap-3 sm:gap-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Teams List
            </h3>
            <div className="w-full sm:ml-auto sm:w-auto">
              <div className="border-2 border-black rounded-full w-full sm:w-[250px] lg:w-[300px] ml-auto p-1 px-3 cursor-pointer group hover:text-white transition-all duration-300 flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl">
                <input
                  type="text"
                  placeholder="Enter Team ID or Name"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="bg-transparent text-stone-900 placeholder-stone-500 p-2 sm:p-2.5 w-full outline-none text-xs sm:text-sm font-medium focus:placeholder-transparent peer"
                  aria-label="Search teams by ID"
                  role="searchbox"
                />
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-black transition-colors duration-200 ml-1" />
              </div>
            </div>
          </div>
          <ul className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTeams.map((team) => (
              <li key={team.teamId}>
                <div
                  onClick={() => setSelectedTeam(team)}
                  className={`p-2 sm:p-3 bg-white border border-black rounded-lg hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer text-black transform hover:scale-105 active:scale-95 ${
                    selectedTeam?.teamId === team.teamId
                      ? "bg-black text-white"
                      : ""
                  } ${team.isEvaluated ? "border-green-500 border-2" : ""} ${
                    team.isUpdated ? "border-blue-500 border-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm sm:text-base">
                      {team.teamId}. {team.teamName}
                    </span>
                    <div className="flex gap-1">
                      {team.isEvaluated && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Evaluated
                        </span>
                      )}
                      {team.isUpdated && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Updated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {filteredTeams.length === 0 && (
              <li className="text-center text-gray-500 py-4">No teams found</li>
            )}
          </ul>
        </div>
      </div>
      {selectedTeam && (
        <div className="w-full lg:flex-1 max-h-[calc(100vh-2rem)] lg:max-h-[580px] border-2 border-black shadow-xl p-3 sm:p-4 lg:p-6 rounded-2xl overflow-y-auto bg-white">
          {/* Team Evaluation Header Card */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-2xl border-2 border-indigo-500 shadow-sm mb-4">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 text-center">
              Evaluating the team:{" "}
              <span className="text-indigo-600 block sm:inline">
                {selectedTeam.teamName}
              </span>
            </h3>
            <p className="text-center text-sm text-gray-500 mt-1">
              Team ID: {selectedTeam.teamId}
              {selectedTeam.isEvaluated && (
                <span className="ml-2 text-green-600 font-medium">
                  (Already Evaluated - This will be an update)
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <EvaluationCard
              title="Innovation"
              maxScore={15}
              borderColor="border-blue-500"
              value={scores.innovation}
              onChange={(value) => handleScoreChange("innovation", value)}
            />
            <EvaluationCard
              title="Creativity"
              maxScore={15}
              borderColor="border-purple-500"
              value={scores.creativity}
              onChange={(value) => handleScoreChange("creativity", value)}
            />
            <EvaluationCard
              title="Technical Implementation"
              maxScore={10}
              borderColor="border-green-500"
              value={scores.technicalImplementation}
              onChange={(value) =>
                handleScoreChange("technicalImplementation", value)
              }
            />
            <EvaluationCard
              title="Use Of Google Technology"
              maxScore={10}
              borderColor="border-orange-500"
              value={scores.useOfGoogleTechnology}
              onChange={(value) =>
                handleScoreChange("useOfGoogleTechnology", value)
              }
            />

            <div
              onClick={handleEvaluate}
              className="border-2 border-black rounded-2xl p-3 sm:p-4 flex justify-center items-center text-stone-900 font-medium bg-stone-500 hover:text-yellow-400 hover:bg-stone-900 cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm sm:text-base"
            >
              <span>Evaluate</span>
              {selectedTeam && (
                <span className="ml-2 inline-block rounded bg-white/20 px-2 py-0.5 text-sm">
                  ID: {selectedTeam.teamId}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-right" />
    </div>
  );
}
