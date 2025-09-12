
import { Association } from "sequelize";
import { UseCaseRequestDAO } from "src/rdbms/dao";
import { Decision } from "src/rdbms/entities/Decision";
import DecisionDto from "src/web/dtos/DecisionDto";
import UseCaseRequestDto from "src/web/dtos/UseCaseRequestDto";
import ViewRequestsRequestDto from "src/web/dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "src/web/dtos/ViewRequestsResponseDto";

interface RequestEndpointServiceI {
    viewAllRequests(request: ViewRequestsRequestDto): Promise<ViewRequestsResponseDto>;
}

const requestDao = new UseCaseRequestDAO();

const viewAllRequests = async (
    request: ViewRequestsRequestDto
): Promise<ViewRequestsResponseDto> => {

    // TODO: Check if authorized adjudicator

    // const useCaseRequests = await requestDao.findAll({include: [{association: 'status'}]});
    const requests: UseCaseRequestDto[] = [];

    // TODO: Generate dtos from data in DB

    // for (const useCaseRequest of useCaseRequests) {
    //     const data = {
    //         ... useCaseRequest,
    //         statusId: useCaseRequest.status?.id,
    //         requestorEmail:
    //     }


    //     requests.push(new UseCaseRequestDto(useCaseRequest));
    // }

    return new ViewRequestsResponseDto({ requests });

}

// const getDecisonDto = (decision: Decision): DecisionDto => {
//     return new DecisionDto({
//         // ... Decision,
//         // adjudicatorEmail: ''
//     });
// }


const requestEndpointService: RequestEndpointServiceI = {
    viewAllRequests
};

export default requestEndpointService;